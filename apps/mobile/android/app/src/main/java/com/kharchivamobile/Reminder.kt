package com.kharchivamobile

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import org.json.JSONArray

/**
 * Daily "did you spend anything today?" reminder (PRD §20–21).
 *
 * - Uses an inexact alarm window, so no exact-alarm permission is needed.
 * - Skips the notification when today already has an entry or was marked
 *   "nothing today", so it never nags someone who has already logged.
 * - "Kuch nahi" from the notification is queued here; the app moves it into its
 *   own database next time it opens.
 */
object Reminder {
  private const val PREFS = "kharchiva_reminder"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_HOUR = "hour"
  private const val KEY_MINUTE = "minute"
  private const val KEY_NOTHING_DAYS = "nothing_days"
  const val CHANNEL_ID = "daily_reminder"
  const val NOTIFICATION_ID = 4101
  const val ACTION_FIRE = "com.kharchivamobile.reminder.FIRE"
  const val ACTION_NOTHING_TODAY = "com.kharchivamobile.reminder.NOTHING_TODAY"
  private const val WINDOW_MS = 15 * 60 * 1000L
  private val INDIA: TimeZone = TimeZone.getTimeZone("Asia/Kolkata")

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isEnabled(context: Context) = prefs(context).getBoolean(KEY_ENABLED, false)
  fun hour(context: Context) = prefs(context).getInt(KEY_HOUR, 21)
  fun minute(context: Context) = prefs(context).getInt(KEY_MINUTE, 0)

  fun enable(context: Context, hour: Int, minute: Int) {
    prefs(context).edit().putBoolean(KEY_ENABLED, true).putInt(KEY_HOUR, hour).putInt(KEY_MINUTE, minute).apply()
    schedule(context)
  }

  fun disable(context: Context) {
    prefs(context).edit().putBoolean(KEY_ENABLED, false).apply()
    alarmManager(context).cancel(firePendingIntent(context))
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  /** Schedules the next reminder at hour:minute India time, today if still ahead, else tomorrow. */
  fun schedule(context: Context) {
    if (!isEnabled(context)) return
    val next = Calendar.getInstance(INDIA).apply {
      set(Calendar.HOUR_OF_DAY, hour(context))
      set(Calendar.MINUTE, minute(context))
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
      if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_MONTH, 1)
    }
    alarmManager(context).setWindow(AlarmManager.RTC_WAKEUP, next.timeInMillis, WINDOW_MS, firePendingIntent(context))
  }

  fun todayKey(): String = dateKey(System.currentTimeMillis())

  private fun dateKey(millis: Long): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = INDIA }.format(millis)

  /** Today was logged in the app, or marked "nothing today" here or in the app. */
  fun isTodayCovered(context: Context): Boolean {
    val today = todayKey()
    if (pendingNothingDays(context).contains(today)) return true
    val file = context.getDatabasePath("kharchiva.db")
    if (!file.exists()) return false
    val start = Calendar.getInstance(INDIA).apply {
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
    val from = iso.format(start.timeInMillis)
    val to = iso.format(start.timeInMillis + 24 * 60 * 60 * 1000L - 1)
    return try {
      SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
        fun count(sql: String, args: Array<String>) =
          db.rawQuery(sql, args).use { if (it.moveToFirst()) it.getLong(0) else 0L }
        count("SELECT COUNT(*) FROM expenses WHERE deletedAt IS NULL AND expenseDate >= ? AND expenseDate <= ?", arrayOf(from, to)) > 0 ||
          count("SELECT COUNT(*) FROM incomes WHERE deletedAt IS NULL AND incomeDate >= ? AND incomeDate <= ?", arrayOf(from, to)) > 0 ||
          count("SELECT COUNT(*) FROM day_status WHERE date = ?", arrayOf(today)) > 0
      }
    } catch (e: Exception) {
      // Missing table on an old install, or the app is mid-write: better to remind than to stay silent.
      false
    }
  }

  fun pendingNothingDays(context: Context): Set<String> {
    val raw = prefs(context).getString(KEY_NOTHING_DAYS, "[]") ?: "[]"
    return try {
      val array = JSONArray(raw)
      (0 until array.length()).map { array.getString(it) }.toSet()
    } catch (e: Exception) {
      emptySet()
    }
  }

  fun addNothingDay(context: Context, date: String) {
    val days = pendingNothingDays(context) + date
    prefs(context).edit().putString(KEY_NOTHING_DAYS, JSONArray(days.sorted()).toString()).apply()
  }

  fun removeNothingDays(context: Context, dates: Set<String>) {
    val days = pendingNothingDays(context) - dates
    prefs(context).edit().putString(KEY_NOTHING_DAYS, JSONArray(days.sorted()).toString()).apply()
  }

  fun showNotification(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Roz ka reminder", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "Ek baar roz poochhta hai ki aaj koi kharcha hua ya nahi"
        },
      )
    }
    val immutable = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    val openApp = PendingIntent.getActivity(
      context, 10, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), immutable,
    )
    val addExpense = PendingIntent.getActivity(
      context, 11, QuickAddActivity.intent(context, QuickAddActivity.MODE_EXPENSE), immutable,
    )
    val nothingToday = PendingIntent.getBroadcast(
      context, 12, Intent(context, ReminderReceiver::class.java).setAction(ACTION_NOTHING_TODAY), immutable,
    )
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_tile_add)
      .setContentTitle("Aaj koi kharcha hua?")
      .setContentText("10 second mein likh lo, ya batao ki aaj kuch nahi hua.")
      .setContentIntent(openApp)
      .setAutoCancel(true)
      .addAction(0, "Kharch jodo", addExpense)
      .addAction(0, "Kuch nahi", nothingToday)
      .build()
    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    } catch (e: SecurityException) {
      // Notification permission was revoked; nothing to do until the user allows it again.
    }
  }

  private fun alarmManager(context: Context) = context.getSystemService(AlarmManager::class.java)

  private fun firePendingIntent(context: Context): PendingIntent =
    PendingIntent.getBroadcast(
      context, 13, Intent(context, ReminderReceiver::class.java).setAction(ACTION_FIRE),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
}

/** Alarm fired, or the user tapped "Kuch nahi" on the notification. */
class ReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Reminder.ACTION_FIRE -> {
        if (!Reminder.isTodayCovered(context)) Reminder.showNotification(context)
        Reminder.schedule(context)
      }
      Reminder.ACTION_NOTHING_TODAY -> {
        Reminder.addNothingDay(context, Reminder.todayKey())
        NotificationManagerCompat.from(context).cancel(Reminder.NOTIFICATION_ID)
      }
    }
  }
}

/** Alarms are cleared on reboot and app update; set the reminder again. */
class ReminderBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      Reminder.schedule(context)
    }
  }
}

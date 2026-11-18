package com.kharchivamobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import org.json.JSONArray

class ReminderModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "KharchivaReminder"

  @ReactMethod
  fun getSettings(promise: Promise) {
    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("enabled", Reminder.isEnabled(context))
        putInt("hour", Reminder.hour(context))
        putInt("minute", Reminder.minute(context))
      },
    )
  }

  @ReactMethod
  fun enable(hour: Double, minute: Double, promise: Promise) {
    val h = hour.toInt()
    val m = minute.toInt()
    if (h !in 0..23 || m !in 0..59) {
      promise.reject("INVALID_TIME", "Time must be between 00:00 and 23:59")
      return
    }
    Reminder.enable(context, h, m)
    promise.resolve(null)
  }

  @ReactMethod
  fun disable(promise: Promise) {
    Reminder.disable(context)
    promise.resolve(null)
  }

  /** JSON array of YYYY-MM-DD days marked "Kuch nahi" from the notification. */
  @ReactMethod
  fun getPendingNothingDays(promise: Promise) {
    promise.resolve(JSONArray(Reminder.pendingNothingDays(context).sorted()).toString())
  }

  @ReactMethod
  fun removePendingNothingDays(datesJson: String, promise: Promise) {
    try {
      val array = JSONArray(datesJson)
      Reminder.removeNothingDays(context, (0 until array.length()).map { array.getString(it) }.toSet())
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("INVALID_DATES", e)
    }
  }
}

class ReminderPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(ReminderModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

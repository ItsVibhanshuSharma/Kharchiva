package com.kharchivamobile

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Tiny on-device queue of money-related SMS waiting for the user's review.
 * Lives in SharedPreferences so messages that arrive while the app is closed are kept.
 */
object SmsStore {
  private const val PREFS = "kharchiva_sms"
  private const val KEY = "pending"
  private const val MAX_ITEMS = 200

  // Only SMS that mention an amount are kept; OTP messages are dropped here so they are never stored.
  private val AMOUNT = Regex("(rs\\.?|inr|₹)\\s*[\\d,]+", RegexOption.IGNORE_CASE)
  private val OTP = Regex("\\botp\\b|one[\\s-]?time password", RegexOption.IGNORE_CASE)

  fun isCandidate(body: String) = AMOUNT.containsMatchIn(body) && !OTP.containsMatchIn(body)

  @Synchronized
  fun add(context: Context, sender: String, body: String, receivedAt: Long) {
    if (!isCandidate(body)) return
    val id = "$receivedAt:${(sender + body).hashCode()}"
    val items = read(context)
    for (i in 0 until items.length()) {
      if (items.getJSONObject(i).getString("id") == id) return
    }
    items.put(JSONObject().put("id", id).put("sender", sender).put("body", body).put("receivedAt", receivedAt))
    val trimmed = JSONArray()
    val start = maxOf(0, items.length() - MAX_ITEMS)
    for (i in start until items.length()) trimmed.put(items.get(i))
    write(context, trimmed)
  }

  @Synchronized
  fun pendingJson(context: Context): String = read(context).toString()

  @Synchronized
  fun remove(context: Context, ids: Set<String>) {
    val items = read(context)
    val kept = JSONArray()
    for (i in 0 until items.length()) {
      val item = items.getJSONObject(i)
      if (item.getString("id") !in ids) kept.put(item)
    }
    write(context, kept)
  }

  private fun read(context: Context): JSONArray =
    try {
      JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"))
    } catch (e: Exception) {
      JSONArray()
    }

  private fun write(context: Context, items: JSONArray) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, items.toString()).apply()
  }
}

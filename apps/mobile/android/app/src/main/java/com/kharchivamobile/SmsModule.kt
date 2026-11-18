package com.kharchivamobile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONArray

class SmsModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "KharchivaSms"

  /** JSON array of {id, sender, body, receivedAt}. */
  @ReactMethod
  fun getPending(promise: Promise) {
    try {
      promise.resolve(SmsStore.pendingJson(context))
    } catch (e: Exception) {
      promise.reject("SMS_READ_FAILED", e)
    }
  }

  /** Takes a JSON array of ids to drop from the queue (saved or dismissed). */
  @ReactMethod
  fun remove(idsJson: String, promise: Promise) {
    try {
      val array = JSONArray(idsJson)
      val ids = HashSet<String>()
      for (i in 0 until array.length()) ids.add(array.getString(i))
      SmsStore.remove(context, ids)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("SMS_REMOVE_FAILED", e)
    }
  }
}

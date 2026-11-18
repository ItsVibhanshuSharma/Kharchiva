package com.kharchivamobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony

/** Receives incoming SMS (needs RECEIVE_SMS) and queues money-related ones for review. */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // Long messages arrive in several parts from the same sender; join them back together.
    val bySender = LinkedHashMap<String, StringBuilder>()
    var receivedAt = System.currentTimeMillis()
    for (part in parts) {
      val sender = part.originatingAddress ?: continue
      bySender.getOrPut(sender) { StringBuilder() }.append(part.messageBody ?: "")
      if (part.timestampMillis > 0) receivedAt = part.timestampMillis
    }
    for ((sender, body) in bySender) SmsStore.add(context, sender, body.toString(), receivedAt)
  }
}

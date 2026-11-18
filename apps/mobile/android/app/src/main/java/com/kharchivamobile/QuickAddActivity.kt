package com.kharchivamobile

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * Translucent window that shows the quick-add card over whatever app is open,
 * without starting the full Kharchiva UI. It renders the "KharchivaQuickAdd"
 * component registered in index.js, on the same React host as the main app.
 */
class QuickAddActivity : ReactActivity() {

  override fun getMainComponentName(): String = "KharchivaQuickAdd"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle =
            Bundle().apply { putString(EXTRA_MODE, modeOf(plainActivity.intent)) }
      }

  companion object {
    const val EXTRA_MODE = "mode"
    const val MODE_EXPENSE = "expense"
    const val MODE_INCOME = "income"
    const val MODE_VOICE = "voice"

    private val MODES = setOf(MODE_EXPENSE, MODE_INCOME, MODE_VOICE)

    fun modeOf(intent: Intent?): String =
        intent?.getStringExtra(EXTRA_MODE)?.takeIf { it in MODES } ?: MODE_EXPENSE

    /** Fresh quick-add window in its own task, so the main app is left untouched. */
    fun intent(context: Context, mode: String): Intent =
        Intent(context, QuickAddActivity::class.java)
            .putExtra(EXTRA_MODE, mode)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
  }
}

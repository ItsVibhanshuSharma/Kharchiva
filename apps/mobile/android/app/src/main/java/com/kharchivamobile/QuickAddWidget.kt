package com.kharchivamobile

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** Home-screen widget with three buttons that open the quick-add window. */
class QuickAddWidget : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
    val views =
        RemoteViews(context.packageName, R.layout.widget_quick_add).apply {
          setOnClickPendingIntent(R.id.widget_expense, launch(context, QuickAddActivity.MODE_EXPENSE, 1))
          setOnClickPendingIntent(R.id.widget_income, launch(context, QuickAddActivity.MODE_INCOME, 2))
          setOnClickPendingIntent(R.id.widget_voice, launch(context, QuickAddActivity.MODE_VOICE, 3))
        }
    widgetIds.forEach { manager.updateAppWidget(it, views) }
  }

  // Distinct request codes keep the three PendingIntents (and their extras) separate.
  private fun launch(context: Context, mode: String, requestCode: Int): PendingIntent =
      PendingIntent.getActivity(
          context,
          requestCode,
          QuickAddActivity.intent(context, mode),
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
}

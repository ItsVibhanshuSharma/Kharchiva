package com.kharchivamobile

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/** Quick Settings tile: pull down the notification shade from any app and tap to add an expense. */
class QuickAddTileService : TileService() {

  override fun onStartListening() {
    super.onStartListening()
    qsTile?.apply {
      state = Tile.STATE_INACTIVE
      updateTile()
    }
  }

  override fun onClick() {
    super.onClick()
    if (isLocked) unlockAndRun { openQuickAdd() } else openQuickAdd()
  }

  @SuppressLint("StartActivityAndCollapseDeprecated")
  private fun openQuickAdd() {
    val intent = QuickAddActivity.intent(this, QuickAddActivity.MODE_EXPENSE)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startActivityAndCollapse(
          PendingIntent.getActivity(
              this, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
    } else {
      @Suppress("DEPRECATION") startActivityAndCollapse(intent)
    }
  }
}

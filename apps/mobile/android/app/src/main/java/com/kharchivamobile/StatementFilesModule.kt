package com.kharchivamobile

import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.io.File

/**
 * Saves a generated statement PDF into the phone's public Downloads folder, so it shows
 * up in Files/Downloads like any other download. Uses MediaStore (Android 10+), which
 * needs no storage permission. Older Android versions reject with UNSUPPORTED and the
 * app falls back to the share sheet.
 */
class StatementFilesModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

  override fun getName() = "KharchivaStatementFiles"

  /** Copies [sourcePath] (an app-private file) to Downloads as [displayName]. Resolves the content:// URI. */
  @ReactMethod
  fun saveToDownloads(sourcePath: String, displayName: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      promise.reject("UNSUPPORTED", "Saving to Downloads needs Android 10 or newer")
      return
    }
    val source = File(sourcePath.removePrefix("file://"))
    // Only files this app created in its own storage may be copied out.
    val allowedRoots = listOfNotNull(context.cacheDir, context.filesDir, context.getExternalFilesDir(null))
    if (!source.isFile || allowedRoots.none { source.canonicalPath.startsWith(it.canonicalPath) }) {
      promise.reject("INVALID_SOURCE", "Statement file not found")
      return
    }
    val safeName = displayName.replace(Regex("[^A-Za-z0-9._-]"), "_").ifBlank { "Kharchiva-Statement.pdf" }
    val resolver = context.contentResolver
    val values =
        ContentValues().apply {
          put(MediaStore.MediaColumns.DISPLAY_NAME, safeName)
          put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
          put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
          put(MediaStore.MediaColumns.IS_PENDING, 1)
        }
    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
    if (uri == null) {
      promise.reject("SAVE_FAILED", "Could not create the file in Downloads")
      return
    }
    try {
      resolver.openOutputStream(uri)?.use { output -> source.inputStream().use { it.copyTo(output) } }
          ?: throw IllegalStateException("No output stream")
      values.clear()
      values.put(MediaStore.MediaColumns.IS_PENDING, 0)
      resolver.update(uri, values, null, null)
      promise.resolve(uri.toString())
    } catch (e: Exception) {
      resolver.delete(uri, null, null)
      promise.reject("SAVE_FAILED", e)
    }
  }

  /** Opens a PDF this app saved to Downloads in the user's PDF viewer. */
  @ReactMethod
  fun openFile(uriString: String, promise: Promise) {
    val uri = Uri.parse(uriString)
    // Only our own MediaStore downloads, never arbitrary URIs from JS.
    if (uri.scheme != "content" || uri.authority != MediaStore.AUTHORITY) {
      promise.reject("INVALID_URI", "Not a saved statement")
      return
    }
    val intent =
        Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/pdf")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
      promise.resolve(null)
    } catch (e: ActivityNotFoundException) {
      promise.reject("NO_VIEWER", "No app can open PDFs")
    }
  }
}

class StatementFilesPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      listOf(StatementFilesModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
      emptyList()
}

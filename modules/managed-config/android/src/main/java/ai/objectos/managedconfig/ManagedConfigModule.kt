package ai.objectos.managedconfig

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.RestrictionsManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads the managed configuration (app restrictions) an EMM sets for the app,
 * through RestrictionsManager. Read-only: the shell never writes it.
 *
 * The keys are declared in res/xml/app_restrictions.xml, which the module's
 * config plugin (app.plugin.js) writes at prebuild.
 */
class ManagedConfigModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }.applicationContext

  override fun definition() = ModuleDefinition {
    Name("ManagedConfig")

    Events("onChange")

    /** The restrictions' string, boolean and integer values; empty when none are set. */
    Function("getManagedConfig") { read() }

    // ACTION_APPLICATION_RESTRICTIONS_CHANGED reaches only receivers registered
    // at runtime, and only while the app runs; the JavaScript side reads the
    // configuration again every time the app becomes active for the rest.
    OnStartObserving { register() }

    OnStopObserving { unregister() }
  }

  private fun read(): Map<String, Any> {
    val manager = context.getSystemService(Context.RESTRICTIONS_SERVICE) as? RestrictionsManager
      ?: return emptyMap()
    val bundle = manager.applicationRestrictions
    val values = mutableMapOf<String, Any>()
    for (key in bundle.keySet()) {
      @Suppress("DEPRECATION")
      when (val value = bundle.get(key)) {
        is String, is Boolean, is Int -> values[key] = value
      }
    }
    return values
  }

  private fun register() {
    if (receiver != null) return
    val next = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        sendEvent("onChange", emptyMap<String, Any>())
      }
    }
    val filter = IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(next, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      context.registerReceiver(next, filter)
    }
    receiver = next
  }

  private fun unregister() {
    val current = receiver ?: return
    receiver = null
    try {
      context.unregisterReceiver(current)
    } catch (_: IllegalArgumentException) {
      // Already unregistered.
    }
  }
}

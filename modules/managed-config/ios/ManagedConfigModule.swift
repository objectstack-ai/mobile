import ExpoModulesCore

/// The managed app configuration an MDM server installs for the app.
private let managedConfigKey = "com.apple.configuration.managed"

/// Reads the MDM managed app configuration. Read-only: the shell never writes it.
public class ManagedConfigModule: Module {
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("ManagedConfig")

    Events("onChange")

    /// The managed dictionary's string, boolean and number values; empty without one.
    Function("getManagedConfig") { () -> [String: Any] in
      return ManagedConfigModule.read()
    }

    // Best effort only. Apple documents `didChangeNotification` as posted for
    // changes the app's own process makes, not for another process's (the MDM
    // daemon installing a configuration), so the JavaScript side also reads the
    // configuration again every time the app becomes active.
    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(
        forName: UserDefaults.didChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onChange", [:])
      }
    }

    OnStopObserving {
      if let observer = self.observer {
        NotificationCenter.default.removeObserver(observer)
        self.observer = nil
      }
    }
  }

  static func read() -> [String: Any] {
    guard let config = UserDefaults.standard.dictionary(forKey: managedConfigKey) else {
      return [:]
    }
    return config.filter { $0.value is String || $0.value is NSNumber }
  }
}

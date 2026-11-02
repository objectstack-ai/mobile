Pod::Spec.new do |s|
  s.name           = 'ManagedConfig'
  s.version        = '0.1.0'
  s.summary        = 'Reads the MDM managed app configuration for the ObjectOS shell.'
  s.description    = 'Reads the MDM managed app configuration for the ObjectOS shell.'
  s.license        = 'MIT'
  s.author         = 'ObjectStack'
  s.homepage       = 'https://github.com/objectstack-ai/mobile'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/objectstack-ai/mobile.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end

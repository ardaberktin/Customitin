# React Native 0.83 requires iOS 15.1; Xcode 27 rejects older pod resource targets.
def configure_pilot_ios(installer)
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      version = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if version && version.match?(/\A\d/) && Gem::Version.new(version) < Gem::Version.new('15.1')
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
      end
    end
    # This upstream script intentionally chooses the Hermes binary on every build.
    target.shell_script_build_phases.each do |phase|
      phase.always_out_of_date = '1' if phase.name&.include?('[Hermes] Replace Hermes')
    end
  end
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.targets.each do |target|
      target.shell_script_build_phases.each do |phase|
        phase.always_out_of_date = '1' if phase.name == 'Bundle React Native code and images'
      end
    end
    project.save
  end
end

import { AppRegistry, Platform } from 'react-native';
import App from './App';
AppRegistry.registerComponent('CustomitinDaybook', () => App);
if (Platform.OS === 'web')
  AppRegistry.runApplication('CustomitinDaybook', {
    rootTag: document.getElementById('root'),
  });

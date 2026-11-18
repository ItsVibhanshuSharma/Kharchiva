/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { QuickAddRoot } from './src/features/quickAdd/QuickAddRoot';

AppRegistry.registerComponent(appName, () => App);
// Opened by QuickAddActivity (widget, Quick Settings tile, app shortcuts) over other apps.
AppRegistry.registerComponent('KharchivaQuickAdd', () => QuickAddRoot);

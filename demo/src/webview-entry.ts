// Order matters: the bridge must define acquireVsCodeApi() before the webview app's
// modules evaluate (ES module imports run depth-first, in source order).
import './theme.css';
import './bridge';
import '../../webview/src/main';
import './webview-overrides.css';

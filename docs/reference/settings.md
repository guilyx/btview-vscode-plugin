<script setup>
import { data } from './package.data.mts'
</script>

# Settings

All settings live under **BTView** in the Settings UI, or as `btview.*` keys in `settings.json`. This table is generated from `package.json` (v{{ data.version }}); [Configuration](../getting-started/CONFIGURATION.md) explains them with examples.

<table>
  <thead>
    <tr><th>Setting</th><th>Type</th><th>Default</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr v-for="s in data.settings" :key="s.key">
      <td><code>{{ s.key }}</code></td>
      <td>{{ s.type }}<div v-if="s.enum"><code v-for="e in s.enum" :key="e" style="margin-right:4px">{{ e }}</code></div></td>
      <td><code>{{ s.default }}</code></td>
      <td>{{ s.description }}</td>
    </tr>
  </tbody>
</table>

## Example: ROS 2 workspace

```json
{
  "btview.rosWorkspaceSetup": "/home/me/ros2_ws/install/setup.bash",
  "btview.rosDistro": "jazzy",
  "btview.defaultOpenMode": "side",
  "btview.nodeTypeMap": {
    "NavigateToGoal": "action",
    "IsBatteryLow": "condition"
  }
}
```

//
// index.ts - main entry point
//

import { sys } from "./sys.ts"

// register handlers
import { handler as ping_handler } from "./handlers/ping.ts"

sys.register("/ping", ping_handler)

// export
export { sys }
export default sys

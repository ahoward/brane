//
// index.ts - main entry point
//

import { sys } from "./sys.ts"

// register handlers
import { handler as ping_handler } from "./handlers/ping.ts"
import { handler as body_init_handler } from "./handlers/body/init.ts"

sys.register("/ping", ping_handler)
sys.register("/body/init", body_init_handler)

// export
export { sys }
export default sys

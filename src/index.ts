//
// index.ts - main entry point
//

import { sys } from "./sys.ts"

// register handlers
import { handler as ping_handler } from "./handlers/ping.ts"
import { handler as body_init_handler } from "./handlers/body/init.ts"
import { handler as body_files_add_handler } from "./handlers/body/files/add.ts"
import { handler as body_files_list_handler } from "./handlers/body/files/list.ts"
import { handler as body_files_status_handler } from "./handlers/body/files/status.ts"

sys.register("/ping", ping_handler)
sys.register("/body/init", body_init_handler)
sys.register("/body/files/add", body_files_add_handler)
sys.register("/body/files/list", body_files_list_handler)
sys.register("/body/files/status", body_files_status_handler)

// export
export { sys }
export default sys

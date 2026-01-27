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
import { handler as body_files_hash_handler } from "./handlers/body/files/hash.ts"
import { handler as body_scan_handler } from "./handlers/body/scan.ts"
import { handler as body_fts_index_handler } from "./handlers/body/fts/index.ts"
import { handler as body_fts_search_handler } from "./handlers/body/fts/search.ts"
import { handler as mind_init_handler } from "./handlers/mind/init.ts"
import { handler as mind_concepts_create_handler } from "./handlers/mind/concepts/create.ts"
import { handler as mind_concepts_get_handler } from "./handlers/mind/concepts/get.ts"
import { handler as mind_concepts_list_handler } from "./handlers/mind/concepts/list.ts"
import { handler as mind_concepts_update_handler } from "./handlers/mind/concepts/update.ts"
import { handler as mind_concepts_delete_handler } from "./handlers/mind/concepts/delete.ts"

sys.register("/ping", ping_handler)
sys.register("/body/init", body_init_handler)
sys.register("/body/files/add", body_files_add_handler)
sys.register("/body/files/list", body_files_list_handler)
sys.register("/body/files/status", body_files_status_handler)
sys.register("/body/files/hash", body_files_hash_handler)
sys.register("/body/scan", body_scan_handler)
sys.register("/body/fts/index", body_fts_index_handler)
sys.register("/body/fts/search", body_fts_search_handler)
sys.register("/mind/init", mind_init_handler)
sys.register("/mind/concepts/create", mind_concepts_create_handler)
sys.register("/mind/concepts/get", mind_concepts_get_handler)
sys.register("/mind/concepts/list", mind_concepts_list_handler)
sys.register("/mind/concepts/update", mind_concepts_update_handler)
sys.register("/mind/concepts/delete", mind_concepts_delete_handler)

// export
export { sys }
export default sys

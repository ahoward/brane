//
// cozo.ts - CozoDB wrapper that works with both dev mode and compiled binaries
//
// In dev mode: Uses cozo-node normally
// When compiling: Uses static require path that Bun can bundle
//
// To compile: Set BRANE_COMPILE=1 or the bundler will include node-pre-gyp
//

// For compilation, we need a static require path that bypasses node-pre-gyp
// This is the same code as cozo-node/bundler.js but with a direct path
// When using github:ahoward/cozo fork, the nodejs package is in cozo-lib-nodejs/
const native = require("../../node_modules/cozo-node/cozo-lib-nodejs/native/6/cozo_node_prebuilt.node")

class CozoTx {
  private tx_id: number

  constructor(id: number) {
    this.tx_id = id
  }

  run(script: string, params: object = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      native.query_tx(this.tx_id, script, params, (err: string | null, result: any) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve(result)
        }
      })
    })
  }

  abort(): void {
    native.abort_tx(this.tx_id)
  }

  commit(): void {
    native.commit_tx(this.tx_id)
  }
}

export class CozoDb {
  private db_id: number

  constructor(engine: string = "mem", path: string = "data.db", options: object = {}) {
    this.db_id = native.open_db(engine, path, JSON.stringify(options))
  }

  close(): void {
    native.close_db(this.db_id)
  }

  multiTransact(write: boolean = false): CozoTx {
    return new CozoTx(native.multi_transact(this.db_id, write))
  }

  run(script: string, params: object = {}, immutable: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      native.query_db(this.db_id, script, params, (err: string | null, result: any) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve(result)
        }
      }, immutable)
    })
  }

  exportRelations(relations: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      native.export_relations(this.db_id, relations, (err: string | null, data: any) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve(data)
        }
      })
    })
  }

  importRelations(data: object): Promise<void> {
    return new Promise((resolve, reject) => {
      native.import_relations(this.db_id, data, (err: string | null) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve()
        }
      })
    })
  }

  importRelationsFromBackup(path: string, relations: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      native.import_from_backup(this.db_id, path, relations, (err: string | null) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve()
        }
      })
    })
  }

  backup(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      native.backup_db(this.db_id, path, (err: string | null) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve()
        }
      })
    })
  }

  restore(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      native.restore_db(this.db_id, path, (err: string | null) => {
        if (err) {
          reject(JSON.parse(err))
        } else {
          resolve()
        }
      })
    })
  }

  registerCallback(relation: string, cb: Function, capacity: number = -1): number {
    return native.register_callback(this.db_id, relation, cb, capacity)
  }

  unregisterCallback(cb_id: number): void {
    native.unregister_callback(this.db_id, cb_id)
  }

  registerNamedRule(name: string, arity: number, cb: (inputs: any, options: any) => Promise<any>): number {
    return native.register_named_rule(this.db_id, name, arity, async (ret_id: number, inputs: any, options: any) => {
      let ret = undefined
      try {
        ret = await cb(inputs, options)
      } catch (e) {
        console.error(e)
        native.respond_to_named_rule_invocation(ret_id, "" + e)
        return
      }
      try {
        native.respond_to_named_rule_invocation(ret_id, ret)
      } catch (e) {
        console.error(e)
      }
    })
  }

  unregisterNamedRule(name: string): void {
    native.unregister_named_rule(this.db_id, name)
  }
}

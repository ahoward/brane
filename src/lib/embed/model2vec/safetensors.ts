//
// safetensors.ts - pure TypeScript safetensors parser
//
// Format: [8 bytes header_size LE] [header JSON] [tensor data]
//

export interface TensorInfo {
  dtype: string
  shape: number[]
  data_offsets: [number, number]
}

export interface ParsedTensors {
  [name: string]: { info: TensorInfo; data: Float32Array }
}

export function parse_safetensors(buffer: ArrayBuffer): ParsedTensors {
  const view = new DataView(buffer)

  // First 8 bytes: header size as uint64 LE
  const header_size = Number(view.getBigUint64(0, true))
  const header_bytes = new Uint8Array(buffer, 8, header_size)
  const header_json = new TextDecoder().decode(header_bytes)
  const header = JSON.parse(header_json)

  const data_offset = 8 + header_size
  const result: ParsedTensors = {}

  for (const [name, info] of Object.entries(header)) {
    if (name === "__metadata__") continue
    const tensor_info = info as TensorInfo
    const [start, end] = tensor_info.data_offsets
    const byte_data = new Uint8Array(buffer, data_offset + start, end - start)
    // Copy into aligned buffer for Float32Array
    const aligned = new ArrayBuffer(byte_data.byteLength)
    new Uint8Array(aligned).set(byte_data)
    result[name] = {
      info: tensor_info,
      data: new Float32Array(aligned)
    }
  }

  return result
}

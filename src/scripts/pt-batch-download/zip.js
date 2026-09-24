// 用脚本自身的 Promise 收集 ZIP 字节流，避开 JSZip 的 Blob/FileReader 读取和 accumulate Promise。
// JSZip 没有取消 API；超时后暂停流并忽略迟到回调，调用方可使用已获取文件降级下载。
const ZIP_IDLE_TIMEOUT_MS = 15000;

function generateZipBlob(zip, onProgress) {
  return new Promise((resolve, reject) => {
    let stream
    let timer
    let settled = false
    let chunks = []

    const fail = error => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      chunks = []
      // pause 是 JSZip 的公开接口；即使暂停失败也必须释放调用方的等待。
      try { stream?.pause() } catch (_) {}
      reject(error)
    }
    const armTimeout = () => {
      clearTimeout(timer)
      timer = setTimeout(() => fail(new Error('ZIP 打包连续 15 秒无进度')), ZIP_IDLE_TIMEOUT_MS)
    }

    try {
      stream = zip.generateInternalStream({ type: 'uint8array', compression: 'STORE' })
      stream.on('data', (chunk, metadata) => {
        if (settled) return
        try {
          chunks.push(chunk)
          armTimeout()
          onProgress(metadata)
        } catch (error) {
          fail(error)
        }
      })
      stream.on('error', fail)
      stream.on('end', () => {
        if (settled) return
        try {
          const blob = new Blob(chunks, { type: 'application/zip' })
          settled = true
          clearTimeout(timer)
          chunks = []
          resolve(blob)
        } catch (error) {
          fail(error)
        }
      })
      armTimeout()
      stream.resume()
    } catch (error) {
      fail(error)
    }
  })
}

export { generateZipBlob };

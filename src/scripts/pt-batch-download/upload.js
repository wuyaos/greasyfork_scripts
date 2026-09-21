

function gmUploadFile({ url, headers = {}, fieldName, fileName, blob, extraFields = {} }) {
    return new Promise((resolve, reject) => {
      const boundary = '----ptbd' + Math.random().toString(36).slice(2)
      const reader = new FileReader()
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result)
        let body = ''
        for (const [key, value] of Object.entries(extraFields)) {
          if (!value) continue
          body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
        }
        const headerStr = `${body}--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: application/x-bittorrent\r\n\r\n`
        const headerBytes = new TextEncoder().encode(headerStr)
        const footerStr = `\r\n--${boundary}--\r\n`
        const footerBytes = new TextEncoder().encode(footerStr)
        const combined = new Uint8Array(headerBytes.length + bytes.length + footerBytes.length)
        combined.set(headerBytes, 0)
        combined.set(bytes, headerBytes.length)
        combined.set(footerBytes, headerBytes.length + bytes.length)
        GM_xmlhttpRequest({
          method: 'POST',
          url,
          headers: { ...headers, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          data: combined.buffer,
          timeout: 30000,
          onload: res => resolve({ status: res.status, responseText: res.responseText, responseHeaders: res.responseHeaders || '' }),
          onerror: () => reject(new Error('上传网络错误')),
          ontimeout: () => reject(new Error('上传超时'))
        })
      }
      reader.onerror = () => reject(new Error('读取种子文件失败'))
      reader.readAsArrayBuffer(blob)
    })
  }



export { gmUploadFile };

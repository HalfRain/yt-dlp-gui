import struct
import zlib

def create_png(width, height, filename):
    # 创建一个简单的深蓝色 PNG
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # 滤波器类型
        for x in range(width):
            # RGB: 深蓝色
            raw_data += bytes([15, 23, 42])
    
    compressed = zlib.compress(raw_data, 9)
    
    # PNG 文件头
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += struct.pack('>I', 13) + b'IHDR' + ihdr
    png += struct.pack('>I', zlib.crc32(b'IHDR' + ihdr) & 0xffffffff)
    
    # IDAT chunk
    png += struct.pack('>I', len(compressed)) + b'IDAT' + compressed
    png += struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    
    # IEND chunk
    png += struct.pack('>I', 0) + b'IEND'
    png += struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    
    with open(filename, 'wb') as f:
        f.write(png)

create_png(32, 32, '32x32.png')
create_png(128, 128, '128x128.png')
create_png(256, 256, 'icon.png')
create_png(512, 512, 'icon.icns')
print("✅ 图标创建成功")

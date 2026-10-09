import struct
import zlib

def create_rgba_png(width, height, filename):
    """创建一个 RGBA 深海军蓝底 + 电光青下载箭头的 PNG 源图标"""
    bg = (15, 23, 42, 255)        # 深海军蓝
    fg = (34, 211, 238, 255)     # 电光青

    # 画一个居中的向下箭头（下载符号）
    cx, cy = width / 2, height / 2
    shaft_w = width * 0.12       # 箭杆宽
    shaft_h = height * 0.28      # 箭杆高
    head_w = width * 0.40        # 箭头宽
    head_h = height * 0.22       # 箭头高

    shaft_top = cy - (shaft_h + head_h) / 2
    shaft_bot = shaft_top + shaft_h
    head_top = shaft_bot
    head_bot = head_top + head_h

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter type 0
        for x in range(width):
            color = bg
            # 箭杆（矩形）
            if (cx - shaft_w / 2 <= x <= cx + shaft_w / 2) and (shaft_top <= y <= shaft_bot):
                color = fg
            # 箭头（三角形：顶部宽，底部收尖）
            elif head_top <= y <= head_bot:
                t = (y - head_top) / head_h  # 0..1
                half_w = head_w / 2 * (1 - t)
                if (cx - half_w <= x <= cx + half_w):
                    color = fg
            raw += bytes(color)

    compressed = zlib.compress(raw, 9)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        c += struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
        return c

    png = b'\x89PNG\r\n\x1a\n'
    # IHDR: width, height, bit depth 8, color type 6 (RGBA), compression 0, filter 0, interlace 0
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(png)
    print(f"created {filename} ({width}x{height} RGBA)")

create_rgba_png(1024, 1024, 'source.png')

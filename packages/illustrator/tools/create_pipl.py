#!/usr/bin/env python3
"""
Generate a minimal PiPL (Plug-in Property List) resource for an
Adobe Illustrator plugin. This replaces the legacy Rez compiler.

Usage: python3 create_pipl.py --name "Dither" --output plugin.pipl
"""

import argparse
import struct

def create_pipl(name: str, entry_point: str = "PluginMain") -> bytes:
    """Generate a binary PiPL resource."""
    properties = []

    # Property: Kind = 'ARPI' (Illustrator plugin)
    properties.append(make_property(b'ADBE', b'kind', struct.pack('>4s', b'ARPI')))

    # Property: Name
    name_bytes = name.encode('ascii')
    name_data = struct.pack('B', len(name_bytes)) + name_bytes
    if len(name_data) % 2 == 1:
        name_data += b'\x00'
    properties.append(make_property(b'ADBE', b'name', name_data))

    # Property: Version = 2 (Illustrator API version)
    properties.append(make_property(b'ADBE', b'ivrs', struct.pack('>I', 2)))

    # Property: Entry point (code descriptor)
    ep_bytes = entry_point.encode('ascii')
    ep_data = struct.pack('B', len(ep_bytes)) + ep_bytes
    if len(ep_data) % 2 == 1:
        ep_data += b'\x00'
    properties.append(make_property(b'ADBE', b'wx86', ep_data))

    # Build PiPL header + properties
    count = len(properties)
    data = struct.pack('>I', count)
    for prop in properties:
        data += prop

    return data


def make_property(vendor: bytes, key: bytes, value: bytes) -> bytes:
    """Pack a single PiPL property: vendor(4) + key(4) + pad(4) + length(4) + data."""
    length = len(value)
    padded_length = (length + 3) & ~3  # Align to 4 bytes
    padding = padded_length - length
    return (
        struct.pack('>4s4sII', vendor, key, 0, length) +
        value +
        b'\x00' * padding
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate PiPL resource')
    parser.add_argument('--name', required=True, help='Plugin name')
    parser.add_argument('--output', required=True, help='Output file path')
    parser.add_argument('--entry', default='PluginMain', help='Entry point function')
    args = parser.parse_args()

    pipl_data = create_pipl(args.name, args.entry)

    with open(args.output, 'wb') as f:
        f.write(pipl_data)

    print(f"Generated PiPL: {args.output} ({len(pipl_data)} bytes)")

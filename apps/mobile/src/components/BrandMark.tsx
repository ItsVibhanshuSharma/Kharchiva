import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { kharchivaIcon } from '../assets';
import { colors } from '../theme';

/**
 * The icon file has a white margin around the purple tile (the tile fills about 79% of it).
 * Scaling the image up inside a clipped, rounded box shows only the tile, so the logo sits
 * cleanly on the off-white screen background instead of inside a visible white square.
 */
const TILE_SHARE = 985 / 1254;
const TILE_RADIUS_RATIO = 0.24;

export function BrandMark({ size = 80 }: { size?: number }) {
  const imageSize = size / TILE_SHARE;
  return (
    <View
      style={[
        styles.box,
        { borderRadius: size * TILE_RADIUS_RATIO, height: size, width: size },
      ]}
    >
      <Image
        accessibilityLabel="Kharchiva"
        source={kharchivaIcon}
        style={{ height: imageSize, width: imageSize }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    elevation: 6,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
});

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

export type FrameType = 'landscape' | 'building' | 'food' | 'selfie' | 'default';

interface CameraOverlayProps {
  frameType: FrameType;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LINE_COLOR = 'rgba(255,255,255,0.3)';
const LINE_THIN = 1;
const BRACKET_LEN = 40;
const BRACKET_THICKNESS = 3;

function CornerBrackets() {
  return (
    <>
      {/* Top-left */}
      <View style={[styles.bracket, { top: 60, left: 24 }]}>
        <View style={[styles.bracketH, { width: BRACKET_LEN }]} />
        <View style={[styles.bracketV, { height: BRACKET_LEN }]} />
      </View>
      {/* Top-right */}
      <View style={[styles.bracket, { top: 60, right: 24 }]}>
        <View style={[styles.bracketH, { width: BRACKET_LEN, alignSelf: 'flex-end' }]} />
        <View style={[styles.bracketV, { height: BRACKET_LEN, alignSelf: 'flex-end' }]} />
      </View>
      {/* Bottom-left */}
      <View style={[styles.bracket, { bottom: 200, left: 24 }]}>
        <View style={[styles.bracketV, { height: BRACKET_LEN }]} />
        <View style={[styles.bracketH, { width: BRACKET_LEN }]} />
      </View>
      {/* Bottom-right */}
      <View style={[styles.bracket, { bottom: 200, right: 24 }]}>
        <View style={[styles.bracketV, { height: BRACKET_LEN, alignSelf: 'flex-end' }]} />
        <View style={[styles.bracketH, { width: BRACKET_LEN, alignSelf: 'flex-end' }]} />
      </View>
    </>
  );
}

function LandscapeGrid() {
  return (
    <View style={styles.gridContainer}>
      <View style={[styles.gridLineH, { top: '33.3%' }]} />
      <View style={[styles.gridLineH, { top: '66.6%' }]} />
      <View style={[styles.gridLineV, { left: '33.3%' }]} />
      <View style={[styles.gridLineV, { left: '66.6%' }]} />
    </View>
  );
}

function BuildingGuides() {
  return (
    <View style={styles.gridContainer}>
      {/* Horizon line */}
      <View style={[styles.gridLineH, { top: '40%' }]} />
      {/* Vertical guides */}
      <View style={[styles.gridLineV, { left: '25%' }]} />
      <View style={[styles.gridLineV, { left: '50%' }]} />
      <View style={[styles.gridLineV, { left: '75%' }]} />
      {/* Perspective vanishing point marker */}
      <View style={styles.vanishingDot} />
    </View>
  );
}

function FoodCircle() {
  const size = SCREEN_W * 0.6;
  return (
    <View style={styles.gridContainer}>
      <View
        style={[
          styles.circleGuide,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
      {/* Crosshair */}
      <View style={[styles.crosshairH]} />
      <View style={[styles.crosshairV]} />
    </View>
  );
}

function SelfieOval() {
  const ovalW = SCREEN_W * 0.5;
  const ovalH = SCREEN_W * 0.7;
  return (
    <View style={styles.gridContainer}>
      <View
        style={[
          styles.ovalGuide,
          {
            width: ovalW,
            height: ovalH,
            borderRadius: ovalW / 2,
            top: SCREEN_H * 0.15,
          },
        ]}
      />
    </View>
  );
}

export default function CameraOverlay({ frameType }: CameraOverlayProps) {
  switch (frameType) {
    case 'landscape':
      return <LandscapeGrid />;
    case 'building':
      return <BuildingGuides />;
    case 'food':
      return <FoodCircle />;
    case 'selfie':
      return <SelfieOval />;
    default:
      return <CornerBrackets />;
  }
}

const styles = StyleSheet.create({
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Rule-of-thirds / grid lines */
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE_THIN,
    backgroundColor: LINE_COLOR,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: LINE_THIN,
    backgroundColor: LINE_COLOR,
  },

  /* Corner brackets */
  bracket: {
    position: 'absolute',
  },
  bracketH: {
    height: BRACKET_THICKNESS,
    backgroundColor: LINE_COLOR,
    borderRadius: 1,
  },
  bracketV: {
    width: BRACKET_THICKNESS,
    backgroundColor: LINE_COLOR,
    borderRadius: 1,
  },

  /* Building vanishing-point dot */
  vanishingDot: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LINE_COLOR,
    marginLeft: -4,
    marginTop: -4,
  },

  /* Food circle + crosshair */
  circleGuide: {
    borderWidth: 2,
    borderColor: LINE_COLOR,
    borderStyle: 'dashed',
  },
  crosshairH: {
    position: 'absolute',
    width: 30,
    height: LINE_THIN,
    backgroundColor: LINE_COLOR,
  },
  crosshairV: {
    position: 'absolute',
    height: 30,
    width: LINE_THIN,
    backgroundColor: LINE_COLOR,
  },

  /* Selfie oval */
  ovalGuide: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: LINE_COLOR,
    borderStyle: 'dashed',
  },
});

import React from 'react';
import { SvgXml } from 'react-native-svg';
import {
  ALLYDOC_LOGO_XML,
  ALLYDOC_LOGO_LIGHT_XML,
  ALLYDOC_MARK_LIGHT_XML,
  ALLYDOC_LOGO_RATIO,
} from '../constants/allydocLogo';

/** The real AllyDoc wordmark (same SVGs as the web app), scaled by height.
 * `light` = the white-text version for dark backgrounds, same prop as the web's own AllyDocLogo.
 * `mark` = only the two-drop brand mark (square, light variant), for tight spots like a compact header. */
export default function AllyDocLogo({ height = 28, light = false, mark = false }) {
  if (mark) {
    return <SvgXml xml={ALLYDOC_MARK_LIGHT_XML} height={height} width={height} />;
  }
  return <SvgXml xml={light ? ALLYDOC_LOGO_LIGHT_XML : ALLYDOC_LOGO_XML} height={height} width={height * ALLYDOC_LOGO_RATIO} />;
}

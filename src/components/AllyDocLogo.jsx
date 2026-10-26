import React from 'react';
import { SvgXml } from 'react-native-svg';
import { ALLYDOC_LOGO_XML, ALLYDOC_LOGO_LIGHT_XML, ALLYDOC_LOGO_RATIO } from '../constants/allydocLogo';

/** The real AllyDoc wordmark (same SVGs as the web app), scaled by height.
 * `light` = the white-text version for dark backgrounds, same prop as the web's own AllyDocLogo. */
export default function AllyDocLogo({ height = 28, light = false }) {
  return <SvgXml xml={light ? ALLYDOC_LOGO_LIGHT_XML : ALLYDOC_LOGO_XML} height={height} width={height * ALLYDOC_LOGO_RATIO} />;
}

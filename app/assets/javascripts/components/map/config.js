/**
 * Configuration for the interactive map
 */

window.MapConfig = (function() {
  'use strict';

  const assetPath = '/public/images/interactive-map';
  const logoAltText = 'Ordnance Survey logo';
  const COMPANY_SYMBOL_CODE = 169;
  const STYLE_COLOR_THEME = {
    'esri-tiles': {
      gcnEdp: '#F47738',
      catchments: '#FD0',
      draw: '#FFF',
      committed: '#FFF'
    },
    outdoorOS: {
      gcnEdp: '#912B88',
      catchments: '#F47738',
      draw: '#AA2A16',
      committed: '#AA2A16'
    },
    dark: {
      gcnEdp: '#F9E1EC',
      catchments: '#BBD4EA',
      draw: '#FFDD00',
      committed: '#FFDD00'
    },
    'black-and-white': {
      gcnEdp: '#912B88',
      catchments: '#F47738',
      draw: '#AA2A16',
      committed: '#AA2A16'
    }
  };

  // API URLs for VTS data (served via /api/maps/vts/ route)
  const defaultData = {
    VTS_OUTDOOR_URL: '/api/maps/vts/OS_VTS_3857_Outdoor.json',
    VTS_DARK_URL: '/api/maps/vts/OS_VTS_3857_Dark.json',
    VTS_BLACK_AND_WHITE_URL: '/api/maps/vts/OS_VTS_3857_Black_and_White.json',
    VTS_ESRI_URL: '/api/maps/vts/ESRI_World_Imagery.json',
    OS_NAMES_URL: '/api/maps/names?query={query}'
  };

  // Snap layers for drawing tools
  const snapLayers = [
    'OS/TopographicArea_1/Agricultural Land',
    'OS/TopographicLine/Building Outline',
    'OS/TopographicArea_1/Building/1',
    'OS/GB_land/1'
  ];

  // Map style configurations (default: Satellite)
  const mapStyles = [
    {
      id: 'esri-tiles',
      label: 'Satellite',
      url: defaultData.VTS_ESRI_URL,
      thumbnail: assetPath + '/aerial-map-thumb.jpg',
      logo: assetPath + '/os-logo-black.svg',
      logoAltText,
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and others',
      backgroundColor: '#ffffff'
    },
    {
      id: 'outdoorOS',
      label: 'Outdoor OS',
      url: defaultData.VTS_OUTDOOR_URL,
      thumbnail: assetPath + '/outdoor-map-thumb.jpg',
      logo: assetPath + '/os-logo.svg',
      logoAltText,
      attribution: `Contains OS data ${String.fromCharCode(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`,
      backgroundColor: '#f5f5f0'
    },
    {
      id: 'dark',
      label: 'Dark',
      url: defaultData.VTS_DARK_URL,
      mapColorScheme: 'dark',
      appColorScheme: 'dark',
      thumbnail: assetPath + '/dark-map-thumb.jpg',
      logo: assetPath + '/os-logo-white.svg',
      logoAltText,
      attribution: `Contains OS data ${String.fromCharCode(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`
    },
    {
      id: 'black-and-white',
      label: 'Black and White',
      url: defaultData.VTS_BLACK_AND_WHITE_URL,
      thumbnail: assetPath + '/black-and-white-map-thumb.jpg',
      logo: assetPath + '/os-logo-black.svg',
      logoAltText,
      attribution: `Contains OS data ${String.fromCharCode(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`
    },
    // Temporarily disabled because snapping relies on OS layer IDs.
    // {
    //   id: 'outdoor',
    //   label: 'Outdoor (OpenFreeMap)',
    //   url: 'https://tiles.openfreemap.org/styles/liberty',
    //   thumbnail: assetPath + '/outdoor-map-thumb.jpg',
    //   logo: assetPath + '/os-logo.svg',
    //   logoAltText,
    //   attribution: `Contains OS data ${String.fromCharCode(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`,
    //   backgroundColor: '#f5f5f0'
    // }
  ];

  function normaliseHex(hex) {
    if (typeof hex !== 'string') {
      return '#000000';
    }

    let value = hex.trim().replace(/^#/, '');

    if (value.length === 3) {
      value = value.split('').map((char) => char + char).join('');
    }

    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      return '#000000';
    }

    return `#${value.toUpperCase()}`;
  }

  function hexToRgba(hex, opacity) {
    const normalisedHex = normaliseHex(hex).slice(1);
    const red = parseInt(normalisedHex.slice(0, 2), 16);
    const green = parseInt(normalisedHex.slice(2, 4), 16);
    const blue = parseInt(normalisedHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
  }

  function getStyleTheme(styleId) {
    return STYLE_COLOR_THEME[styleId] || STYLE_COLOR_THEME[mapStyles[0].id];
  }

  function getStyleLayerColor(styleId, colorKey) {
    const theme = getStyleTheme(styleId);
    return theme?.[colorKey] || '#000000';
  }

  function buildStyleColorMap(colorKey, opacity) {
    return Object.keys(STYLE_COLOR_THEME).reduce((accumulator, styleId) => {
      const color = getStyleLayerColor(styleId, colorKey);
      accumulator[styleId] = typeof opacity === 'number' ? hexToRgba(color, opacity) : color;
      return accumulator;
    }, {});
  }

  // Dataset configurations for vector tile layers
  const datasets = [
    {
      id: 'gcn-edp',
      label: 'Nature Restoration Fund great crested newt levy',
      tiles: [`${window.location.origin}/tiles/data/gcn_edp_all_regions/{z}/{x}/{y}.pbf`],
      sourceLayer: 'gcn_edp_all_regions',
      stroke: buildStyleColorMap('gcnEdp'),
      strokeWidth: 2,
      fill: buildStyleColorMap('gcnEdp', 0.15),
      symbolDescription: { outdoor: 'Orange outline' },
      minZoom: 0,
      maxZoom: 12,
      showInKey: false,
      showInLayers: false,
      visibility: 'visible'
    },
    {
      id: 'catchments',
      label: 'Nature Restoration Fund nutrients levy areas',
      tiles: [`${window.location.origin}/tiles/data/catchments_nn_catchments_03_2024/{z}/{x}/{y}.pbf`],
      sourceLayer: 'catchments_nn_catchments_03_2024',
      stroke: buildStyleColorMap('catchments'),
      strokeWidth: 2,
      fill: buildStyleColorMap('catchments', 0.15),
      symbolDescription: { outdoor: 'Blue outline' },
      minZoom: 0,
      maxZoom: 10,
      showInKey: false,
      showInLayers: false,
      visibility: 'visible'
    }
  ];

  const searchDatasets = [
    {
      name: 'osNames',
      urlTemplate: 'https://api.os.uk/search/names/v1/find?query={query}',
      parseResults: (json, query) => {
        // Transform OS Names API response to match expected format
        if (!json || !json.results || json.results.length === 0) return []
        
        return json.results.slice(0, 8).map(item => ({
          id: item.GAZETTEER_ENTRY.ID,
          text: `${item.GAZETTEER_ENTRY.NAME1}${item.GAZETTEER_ENTRY.COUNTY_UNITARY ? ', ' + item.GAZETTEER_ENTRY.COUNTY_UNITARY : ''}`,
          bounds: [
            item.GAZETTEER_ENTRY.MBR_XMIN,
            item.GAZETTEER_ENTRY.MBR_YMIN,
            item.GAZETTEER_ENTRY.MBR_XMAX,
            item.GAZETTEER_ENTRY.MBR_YMAX
          ],
          point: [item.GAZETTEER_ENTRY.GEOMETRY_X, item.GAZETTEER_ENTRY.GEOMETRY_Y]
        }))
      }
    },
    {
      name: 'postcodes',
      urlTemplate: 'https://api.postcodes.io/postcodes?query={query}',
      parseResults: (json, query) => {
        // Transform postcodes.io response to match expected format
        if (!json.result) return []
        
        return json.result.slice(0, 8).map(item => ({
          name: `${item.postcode}`,
          description: `${item.admin_district}, ${item.region}`,
          bounds: [
            item.longitude - 0.01,
            item.latitude - 0.01,
            item.longitude + 0.01,
            item.latitude + 0.01
          ]
        }))
      }
    }
  ];

  return {
    assetPath,
    logoAltText,
    COMPANY_SYMBOL_CODE,
    STYLE_COLOR_THEME,
    hexToRgba,
    getStyleTheme,
    getStyleLayerColor,
    buildStyleColorMap,
    snapLayers,
    mapStyles,
    datasets,
    defaultData,
    searchDatasets
  };
})();

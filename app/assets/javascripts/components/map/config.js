/**
 * Configuration for the interactive map
 */

window.MapConfig = (function() {
  'use strict';

  const assetPath = '/public/images/interactive-map';
  const logoAltText = 'Ordnance Survey logo';
  const COMPANY_SYMBOL_CODE = 169;

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

  // Map style configurations
  const mapStyles = [
    {
      id: 'outdoor',
      label: 'Outdoor (OpenFreeMap)',
      url: 'https://tiles.openfreemap.org/styles/liberty',
      thumbnail: assetPath + '/outdoor-map-thumb.jpg',
      logo: assetPath + '/os-logo.svg',
      logoAltText,
      attribution: `Contains OS data ${String.fromCharCode(COMPANY_SYMBOL_CODE)} Crown copyright and database rights ${new Date().getFullYear()}`,
      backgroundColor: '#f5f5f0'
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
    {
      id: 'esri-tiles',
      label: 'Satellite',
      url: defaultData.VTS_ESRI_URL,
      thumbnail: assetPath + '/aerial-map-thumb.jpg',
      logo: assetPath + '/os-logo-black.svg',
      logoAltText,
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and others',
      backgroundColor: '#ffffff'
    }
  ];

  // Dataset configurations for vector tile layers
  const datasets = [
    {
      id: 'gcn-edp',
      label: 'Nature Restoration Fund great crested newt levy',
      tiles: [`${window.location.origin}/tiles/data/gcn_edp_all_regions/{z}/{x}/{y}.pbf`],
      sourceLayer: 'gcn_edp_all_regions',
      stroke: '#f47738',
      strokeWidth: 2,
      fill: 'rgba(244, 119, 56, 0.1)',
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
      stroke: '#0000ff',
      strokeWidth: 2,
      fill: 'rgba(0, 0, 255, 0.1)',
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
    snapLayers,
    mapStyles,
    datasets,
    defaultData,
    searchDatasets
  };
})();

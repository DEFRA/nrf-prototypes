// Journey flow diagram (/tools/journeys/<journey>)
//
// Lays out the graph from journey.yaml with ELK and draws it as SVG. Main
// chain edges get a high straightness priority so the default path through
// the journey stays on a single row, with branches and exits hanging below.
;(function () {
  const dataEl = document.getElementById('flow-data')
  const container = document.getElementById('flow-diagram')
  if (!dataEl || !container || typeof window.ELK !== 'function') {
    return
  }

  const graph = JSON.parse(dataEl.textContent)
  const NODE_WIDTH = 170
  const LABEL_WIDTH = 180
  const SVG_NS = 'http://www.w3.org/2000/svg'
  const XHTML_NS = 'http://www.w3.org/1999/xhtml'

  function el(name, attrs) {
    const node = document.createElementNS(SVG_NS, name)
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key])
    })
    return node
  }

  function nodeLabelHtml(node) {
    const label = document.createElement('div')
    label.className = 'flow-node__label'
    const id = document.createElement('b')
    id.textContent = node.id
    label.appendChild(id)
    label.appendChild(document.createElement('br'))
    label.appendChild(document.createTextNode(node.heading))
    return label
  }

  function edgeLabelHtml(text, size) {
    const label = document.createElement('div')
    label.className = 'flow-edge-label'
    label.textContent = text
    if (size) {
      label.style.width = size.width + 'px'
      label.style.whiteSpace = size.wrap ? 'normal' : 'nowrap'
    }
    return label
  }

  // ELK needs sizes up front, so render every label off-screen and measure it
  function measure() {
    const probe = document.createElement('div')
    probe.className = 'flow-measure'
    // Measure on the body, not in the container: the Flow tab can be hidden
    // (display: none) at load, and offsetWidth/offsetHeight are 0 in there
    document.body.appendChild(probe)
    // Every node gets the tallest label's height so the main row lines up
    let nodeHeight = 0
    graph.nodes.forEach(function (node) {
      const label = nodeLabelHtml(node)
      label.style.width = NODE_WIDTH + 'px'
      probe.appendChild(label)
      nodeHeight = Math.max(nodeHeight, label.offsetHeight)
    })
    // Edge labels stay on one line unless they are wider than LABEL_WIDTH
    const edgeSize = {}
    graph.edges.forEach(function (edge) {
      if (edge.label) {
        const label = edgeLabelHtml(edge.label)
        label.style.whiteSpace = 'nowrap'
        probe.appendChild(label)
        const wrap = label.offsetWidth > LABEL_WIDTH
        if (wrap) {
          label.style.whiteSpace = 'normal'
          label.style.width = LABEL_WIDTH + 'px'
        }
        edgeSize[edge.id] = {
          width: Math.ceil(label.offsetWidth) + 2,
          height: Math.ceil(label.offsetHeight) + 2,
          wrap: wrap
        }
      }
    })
    probe.remove()
    return { nodeHeight, edgeSize }
  }

  function buildElkGraph(sizes) {
    return {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.layered.cycleBreaking.strategy': 'MODEL_ORDER',
        'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
        'elk.edgeLabels.inline': 'true',
        'elk.edgeLabels.placement': 'CENTER',
        'elk.spacing.nodeNode': '30',
        'elk.layered.spacing.nodeNodeBetweenLayers': '60',
        'elk.spacing.edgeNode': '20',
        'elk.layered.spacing.edgeNodeBetweenLayers': '20',
        'elk.spacing.edgeEdge': '15',
        'elk.spacing.edgeLabel': '6'
      },
      // One fixed port on each side, so every edge meets the node at its
      // vertical centre and a straight main edge means an aligned row
      children: graph.nodes.map(function (node) {
        const middle = sizes.nodeHeight / 2
        return {
          id: node.id,
          width: NODE_WIDTH,
          height: sizes.nodeHeight,
          layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
          ports: [
            {
              id: node.id + '.in',
              x: 0,
              y: middle,
              width: 0,
              height: 0,
              layoutOptions: { 'elk.port.side': 'WEST' }
            },
            {
              id: node.id + '.out',
              x: NODE_WIDTH,
              y: middle,
              width: 0,
              height: 0,
              layoutOptions: { 'elk.port.side': 'EAST' }
            }
          ]
        }
      }),
      edges: graph.edges.map(function (edge) {
        const priority = edge.onMainChain ? '10' : '1'
        const size = sizes.edgeSize[edge.id]
        return {
          id: edge.id,
          sources: [edge.fromId + '.out'],
          targets: [edge.toId + '.in'],
          labels: size
            ? [{ text: edge.label, width: size.width, height: size.height }]
            : [],
          layoutOptions: {
            'elk.layered.priority.straightness': priority,
            'elk.layered.priority.direction': priority
          }
        }
      })
    }
  }

  function edgePath(section) {
    const points = [section.startPoint]
      .concat(section.bendPoints || [])
      .concat([section.endPoint])
    return points
      .map(function (p, i) {
        return (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y
      })
      .join(' ')
  }

  function render(layout, sizes) {
    graph.edges.forEach(function (edge) {
      edge.size = sizes.edgeSize[edge.id]
    })
    const byId = {}
    graph.nodes.forEach(function (node) {
      byId[node.id] = node
    })
    const edgeById = {}
    graph.edges.forEach(function (edge) {
      edgeById[edge.id] = edge
    })
    const pad = 10
    const width = Math.ceil(layout.width + pad * 2)
    const height = Math.ceil(layout.height + pad * 2)
    const svg = el('svg', {
      xmlns: SVG_NS,
      width: width,
      height: height,
      viewBox: '0 0 ' + width + ' ' + height,
      class: 'flow-svg',
      role: 'img',
      'aria-label': 'Journey flow diagram'
    })
    const defs = el('defs')
    const marker = el('marker', {
      id: 'flow-arrow',
      viewBox: '0 0 10 10',
      refX: '9',
      refY: '5',
      markerWidth: '8',
      markerHeight: '8',
      orient: 'auto-start-reverse'
    })
    marker.appendChild(el('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#0b0c0c' }))
    defs.appendChild(marker)
    svg.appendChild(defs)

    const root = el('g', { transform: 'translate(' + pad + ' ' + pad + ')' })
    svg.appendChild(root)

    const edgesGroup = el('g', { class: 'flow-edges' })
    const labelsGroup = el('g', { class: 'flow-edge-labels' })
    ;(layout.edges || []).forEach(function (edge) {
      const meta = edgeById[edge.id]
      ;(edge.sections || []).forEach(function (section) {
        edgesGroup.appendChild(
          el('path', {
            d: edgePath(section),
            class: 'flow-edge' + (meta.dashed ? ' flow-edge--dashed' : ''),
            'marker-end': 'url(#flow-arrow)'
          })
        )
      })
      ;(edge.labels || []).forEach(function (label) {
        const fo = el('foreignObject', {
          x: label.x,
          y: label.y,
          width: label.width,
          height: label.height
        })
        const div = edgeLabelHtml(label.text, edgeById[edge.id].size)
        div.setAttribute('xmlns', XHTML_NS)
        fo.appendChild(div)
        labelsGroup.appendChild(fo)
      })
    })
    root.appendChild(edgesGroup)
    root.appendChild(labelsGroup)

    const nodesGroup = el('g', { class: 'flow-nodes' })
    ;(layout.children || []).forEach(function (child) {
      const node = byId[child.id]
      const link = el('a', {
        href: node.path + '?preview=1',
        target: '_blank',
        rel: 'noopener'
      })
      link.appendChild(
        el('rect', {
          x: child.x,
          y: child.y,
          width: child.width,
          height: child.height,
          rx: 2,
          class: 'flow-node flow-node--' + node.kind,
          'data-id': node.id,
          'data-main-chain': String(node.onMainChain)
        })
      )
      const fo = el('foreignObject', {
        x: child.x,
        y: child.y,
        width: child.width,
        height: child.height,
        class: 'flow-node__text flow-node__text--' + node.kind
      })
      const div = nodeLabelHtml(node)
      div.setAttribute('xmlns', XHTML_NS)
      fo.appendChild(div)
      link.appendChild(fo)
      nodesGroup.appendChild(link)
    })
    root.appendChild(nodesGroup)

    container.innerHTML = ''
    container.appendChild(svg)
    return svg
  }

  function setupZoom(svg) {
    const slider = document.getElementById('flow-scale')
    const label = document.getElementById('flow-scale-value')
    if (!slider) {
      return
    }
    // The rendered width comes from the SVG's own attribute, not from
    // getBoundingClientRect(): inside a hidden tab the rect is 0 wide, which
    // would pin the diagram to 0px at every zoom level
    const fullWidth =
      parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width
    const STORAGE_KEY = 'journey-tools-flow-scale'

    function apply(value) {
      const scale = parseFloat(value)
      svg.style.width = fullWidth * scale + 'px'
      if (label) {
        label.textContent = Math.round(scale * 100) + '%'
      }
    }

    // Inside a hidden tab the container has no width, so fall back to the
    // nearest visible ancestor
    const padding = parseFloat(getComputedStyle(container).paddingLeft) * 2
    let available = container.clientWidth
    let ancestor = container.parentElement
    while (available === 0 && ancestor) {
      available = ancestor.clientWidth
      ancestor = ancestor.parentElement
    }
    const fit = Math.min(1, (available - padding) / fullWidth)
    let initial = Math.max(parseFloat(slider.min), Math.floor(fit * 20) / 20)
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        initial = saved
      }
    } catch (error) {
      // localStorage unavailable; fit to width
    }
    slider.value = initial
    apply(initial)

    slider.addEventListener('input', function () {
      apply(slider.value)
      try {
        window.localStorage.setItem(STORAGE_KEY, slider.value)
      } catch (error) {
        // ignore
      }
    })
  }

  const sizes = measure()
  const elk = new window.ELK()
  elk
    .layout(buildElkGraph(sizes))
    .then(function (layout) {
      setupZoom(render(layout, sizes))
      container.dataset.rendered = 'true'
    })
    .catch(function (error) {
      container.textContent = 'Could not lay out the flow: ' + error.message
    })
})()

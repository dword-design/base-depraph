import server from '../server'
import { spawn } from 'child-process-promise'
import dot from '../dot'
import express from 'express'
import path from 'path'
import depcruise from '../depcruise'
import { map, flatMap } from '@functions'

export const name = 'spring'
export const description = 'Output the dependency graph using spring layout'
export const options = [
  { name: '-c, --cluster', description: 'Use the folder structure to generate clusters' },
  { name: '-d, --draggable', description: 'Whether the graph should be draggable' },
]
export const handler = ({ clusters: isClusters, draggable: isDraggable }) => isDraggable
  ? server(app => app
    .use(express.static(path.resolve(__dirname, 'client')))
    .get('/graph', (req, res) => depcruise()
      .then(modules => res.send({
        modules: modules |> map('source'),
        dependencies: modules
          |> flatMap(({ source, dependencies }) => dependencies |> map(({ resolved }) => ({ source, target: resolved }))),
        isClusters,
      }))
    )
  )
  : server(app => app
    .get('/', (req, res) => dot()
      .then(dot => spawn('dot', ['-T', 'svg', '-K', 'neato'], { capture: ['stdout'] })
        .progress(({ stdin }) => {
          stdin.write(dot)
          stdin.end()
        })
      )
      .then(({ stdout: svgCode }) => {
        res.setHeader('Content-Type', 'image/svg+xml')
        return res.send(svgCode)
      })
    )
  )

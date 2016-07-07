import bus from '../lib/bus'
import matches from 'dom-matches'
import * as api from './api'
import invite from '../templates/invite-opponent'
import player from '../templates/player-control'

var state = {}

export default function () {
  // Translate User Clicks out to app
  document.querySelector('.js-board').addEventListener('click', e => {
    e.preventDefault()
    if (matches(e.target, '.js-node')) {
      let x = parseInt(e.target.getAttribute('data-x'))
      let y = parseInt(e.target.getAttribute('data-y'))
      if (document.querySelector('.js-game-over')) {
        bus.emit('stone:remove', x, y, state)
      } else {
        bus.emit('game:play', x, y, state)
      }
    } else if (matches(e.target, '.js-pass')) {
      var color = e.target.getAttribute('data-color')
      bus.emit('game:pass', color, state)
    } else if (matches(e.target, '.js-resign')) {
      var color = e.target.getAttribute('data-color')
      bus.emit('game:resign', color, state)
    }
  })
  // Translate App Events in to component
  bus.on('view:set', handleBoard)
  bus.on('game:change', render)
  bus.on('game:change', updateGameState)
  bus.on('game:change', gameIsOver)
  bus.on('game:play', api.play)
  bus.on('game:pass', api.pass)
  bus.on('game:over', cleanBoard)
}

function updateGameState (game) {
  state.game = game
  bus.emit('game:write', state.game)
}

function gameIsOver(game) {
  if (game.resigned) {
    bus.emit('player:resigned', game.resigned.quitter)
  }
  if (game.pass.black && game.pass.white) {
    bus.emit('game:over', game)
  } else if (game.resign.black || game.resign.white) {
    bus.emit('game:over', game)
  }
  document.querySelector('.js-board').classList.add('js-game-over')
  document.querySelector('.js-board').classList.add('game-is-over')
}

function updateStatePlayer (color) {
  var board = document.querySelector('.js-board')
  state.player = color.toUpperCase()
}

function cleanBoard (game) {
  var cleaner = document.querySelector('.js-tidy-flag')
  cleaner.removeAttribute('hidden')
}

function handleBoard (options) {
  var board = document.querySelector('.js-board')
  if (options.watching) {
    board.classList.remove(`player-white`)
    board.classList.remove(`player-black`)
    board.classList.add('watching')
  } else if (options.playing) {
    updateStatePlayer(options.playing.color)
    board.classList.remove(`player-white`)
    board.classList.remove(`player-black`)
    board.classList.add(`player-${options.playing.color}`)
    board.setAttribute('data-me', options.playing.color)
  }
}

function render (game) {
  if (!game) return
  var rows = game.goban.map((r, y) => {
    var row = r.map((n, x) => {
      var isLast = game.last[0] === y && game.last[1] === x ? 'node-last' : ''
      var nodeClass = `js-node node ${isLast} `
      if (n === 'o') {
        nodeClass += 'node-white'
      } else if (n === 'x') {
        nodeClass += 'node-black'
      } else {
        nodeClass += 'node-empty'
      }
      return `<a href="" class="${nodeClass}" data-x="${x}" data-y="${y}"></a>`
    })
    return `<div class="board-row">${row.join('')}</div>`
  })

  let full = game.joined && game.joined.black && game.joined.white ? 'board-full' : ''
  let me = document.querySelector('.js-board').getAttribute('data-me')
  let them = me === 'white' ? 'black' : 'white'
  document.querySelector('.js-board').innerHTML = `
    ${player(me, game.pass[me])}
    <section class="board board-purple
                    ${full}
                    board-turn-${game.turn}
                    board-${game.size}x${game.size}">
      ${rows.join('')}
      ${invite(game, them)}
    </section>
    ${player(them, game.pass[them])}
  `
  if (game.deadStones) {
    game.deadStones.map(function (coords) {
      bus.emit('stone:mark', coords)
    })
  }
}

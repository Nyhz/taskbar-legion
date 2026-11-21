// The strip events (data/stripEvents): the runaway chest and the wandering merchant's window.
export const events = {
  merchantTitle: 'Merchant',
  merchantName: 'Wandering merchant',
  merchantHelp: 'He stops behind the party for a little while and sells a few things, each one once. Then he moves on.',
  merchantClose: 'Close',
  merchantLeaves: 'Leaves in {s} s',
  buy: 'Buy',
  buyHelp: 'Buy it for {price} gold. It goes to your bag (or the stash if the bag is full).',
  sold: 'Sold',
  soldHelp: 'Already bought.',
  tooPoor: 'Not enough gold.',
  noRoom: 'No room in the bag or the stash.',
} as const;

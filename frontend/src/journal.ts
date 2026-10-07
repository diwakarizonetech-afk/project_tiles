export type Article={id:string;category:string;title:string;excerpt:string;image:string;imageAlt:string;readTime:string;sections:{heading:string;body:string}[]}

const catalogBase=(import.meta.env.VITE_API_URL??'http://localhost:8000').replace(/\/$/,'')+'/catalog/'

export const articles:Article[]=[
  {id:'colour-and-tile',category:'DESIGN NOTES',title:'How to pair wall colour with the tile you love',excerpt:'A simple way to build a room palette from the floor up—without guessing from a tiny sample.',image:catalogBase+'marble_01.jpg',imageAlt:'Photographed warm stone tile material',readTime:'4 MIN READ',sections:[
    {heading:'Begin with the undertone',body:'Look closely at the tile in natural daylight. Is its quietest colour warm, cool or neutral? Carry one of those undertones into the wall paint, then add contrast through furniture and fabric.'},
    {heading:'Test the whole room',body:'A wall colour can look different beside a large floor than it does on a small paint chip. Try two or three shades in the live house, then compare them again at a brighter and softer daylight setting.'},
    {heading:'Keep one element calm',body:'When the floor has a strong vein or pattern, a quieter wall finish lets it lead. With a restrained tile, limewash, fine stripes or a feature wall can bring more character.'}
  ]},
  {id:'room-by-room',category:'MATERIAL GUIDE',title:'Choosing surfaces room by room',excerpt:'The same home can hold more than one tile story. Here is how to keep it feeling connected.',image:catalogBase+'wood_floor.jpg',imageAlt:'Photographed wood floor material',readTime:'5 MIN READ',sections:[
    {heading:'Create a common thread',body:'Repeat a tone or material mood through the rooms, even if the actual tile changes. A warm stone in the living room can sit comfortably beside a wood-look floor in a suite.'},
    {heading:'Think about the room’s use',body:'For kitchens and bathrooms, ask the supplier about the actual product’s slip rating, water suitability and cleaning needs. A digital preview helps with appearance, but technical suitability must be checked against the physical tile.'},
    {heading:'View transitions from the doorway',body:'Use the walkthrough to stand where one room opens into the next. Check that the colours and grout rhythm feel intentional together, not only when each room is viewed alone.'}
  ]},
  {id:'small-spaces',category:'STUDIO JOURNAL',title:'Small spaces, confident pattern',excerpt:'Scale, light and one considered accent can make a compact space feel distinctly yours.',image:catalogBase+'old_mosaic_floor.jpg',imageAlt:'Photographed mosaic tile material',readTime:'3 MIN READ',sections:[
    {heading:'Let scale do the work',body:'A larger tile can create a quieter visual field, while a smaller mosaic adds more rhythm. Try both in the 3D room at the same viewing position before deciding.'},
    {heading:'Choose the focal surface',body:'One expressive floor or wall is often enough. Keep neighbouring finishes more restrained so the pattern has space to breathe.'},
    {heading:'Check it in real light',body:'Bright and soft light reveal different details. Use the daylight control in the showroom, and always confirm the final colour and finish with a physical sample.'}
  ]}
]


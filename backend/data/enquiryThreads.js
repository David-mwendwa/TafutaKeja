/**
 * Conversations, written as whole threads rather than as a bag of openings and
 * a bag of replies.
 *
 * Pairing a random question with a random answer produces threads where the
 * agent answers something nobody asked, which is exactly the tell that gives a
 * generated demo away. Each template here is one coherent exchange, and carries
 * the shape it ends in: who spoke last decides what is unread, and on which
 * side of the inbox.
 *
 * `fits` narrows a template to the listings it makes sense on. A question about
 * the service charge does not belong on a plot of land.
 */
const residential = (l) => !['land', 'commercial'].includes(l.propertyType);
const toLet = (l) => l.purpose === 'rent' && residential(l);
const forSale = (l) => l.purpose === 'sale' && residential(l);
const land = (l) => l.propertyType === 'land';
const commercial = (l) => l.propertyType === 'commercial';

export const THREADS = [
  {
    fits: toLet,
    status: 'new',
    message:
      'Hi, is this still available? I am looking to move at the end of the month and could view any evening this week.',
    replies: [],
  },
  {
    fits: toLet,
    status: 'replied',
    message:
      'Good afternoon. Is the service charge included in the quoted rent, and what does it cover?',
    replies: [
      { from: 'agent', body: 'Good afternoon. It is separate, and it covers water, security, the lift and grounds maintenance. I can send you the last three months of statements if that helps.' },
    ],
  },
  {
    fits: toLet,
    status: 'replied',
    message:
      'I am interested in viewing this. Would Saturday morning work? I can come any time before midday.',
    replies: [
      { from: 'agent', body: 'Saturday works. Shall we say 10am? I will meet you at the gate, ask the guard for me by name.' },
      { from: 'sender', body: 'Perfect, 10am on Saturday. One more thing: is the landlord flexible on the deposit? Three months is a lot up front.' },
      { from: 'agent', body: 'He has taken two months before for a tenant on a longer lease. Let us discuss it after you have seen the place.' },
    ],
  },
  {
    fits: toLet,
    status: 'new',
    message:
      'Does the compound allow pets? I have one indoor cat, no dogs. I did not want to waste your time viewing if the answer is no.',
    replies: [],
  },
  {
    fits: toLet,
    status: 'replied',
    message:
      'What is the water situation? I have been in a block on county supply and it was two days a week in a dry month.',
    replies: [
      { from: 'agent', body: 'There is a borehole and storage tanks on the roof, so it runs through the dry season. The last outage here was a pump fault two years ago and it was back the same day.' },
      { from: 'sender', body: 'That is reassuring, thank you. I will come and see it this weekend.' },
    ],
  },
  {
    fits: toLet,
    status: 'closed',
    message:
      'Is parking included, and is there space for a second car? We have two and street parking is not an option for us.',
    replies: [
      { from: 'agent', body: 'One bay is included and a second is available at an extra charge per month. There are two free at the moment.' },
      { from: 'sender', body: 'Thank you. We have gone with somewhere closer to the school in the end, but I appreciate the quick reply.' },
    ],
  },
  {
    fits: toLet,
    status: 'replied',
    message:
      'How is the fibre here? I work from home four days a week and the connection is genuinely the thing that decides it for me.',
    replies: [
      { from: 'agent', body: 'Two providers have run fibre into the block and most tenants are on one of them. The ducting is already in the unit, so it is an install rather than a new line.' },
    ],
  },
  {
    fits: forSale,
    status: 'replied',
    message:
      'Is the title ready, and is it freehold or leasehold? I would want my advocate to see a copy before we go any further.',
    replies: [
      { from: 'agent', body: 'The title is ready and clean. I can share a copy with your advocate once you have viewed, and the owner is happy for a search to be done at Ardhi House.' },
      { from: 'sender', body: 'Understood. Could we view on Thursday afternoon?' },
    ],
  },
  {
    fits: forSale,
    status: 'new',
    message:
      'Is the asking price negotiable? I am a cash buyer and could close quickly, which I hope counts for something.',
    replies: [],
  },
  {
    fits: land,
    status: 'replied',
    message:
      'Has this been surveyed, and are beacons in place? I would also like to know whether there is an access road in the rains.',
    replies: [
      { from: 'agent', body: 'It is surveyed and the beacons are in. The access is murram and it holds up, though a saloon car will want to take it slowly after heavy rain.' },
    ],
  },
  {
    fits: land,
    status: 'new',
    message:
      'What are the rates and the ground rent on this one, and is there any pending land rates arrear I should know about?',
    replies: [],
  },
  {
    fits: commercial,
    status: 'replied',
    message:
      'Is this suitable for a small clinic? I would need a waiting area and two consultation rooms, plus reliable power.',
    replies: [
      { from: 'agent', body: 'The layout takes that comfortably, and there is a backup generator for the whole block. Change of user is already in place for medical, which saves you a step.' },
      { from: 'sender', body: 'That is exactly what I needed to know. I will arrange to come through this week.' },
    ],
  },
  {
    fits: commercial,
    status: 'new',
    message:
      'What is the rent per square metre, and is there a service charge on top? I am comparing a few units along this road.',
    replies: [],
  },
  {
    fits: commercial,
    status: 'new',
    message:
      'Is there dedicated parking for customers, and what are the access hours? We would be opening early and closing late.',
    replies: [],
  },
  {
    fits: land,
    status: 'new',
    message:
      'Is the plot fenced, and how far is the nearest water and power connection? I am planning to build within the year.',
    replies: [],
  },
  {
    fits: toLet,
    status: 'replied',
    message:
      'We are a family of four moving from Mombasa in March. Could you tell me about the schools within reach, and whether the estate is quiet in the evenings?',
    replies: [
      { from: 'agent', body: 'There are three primary schools within about two kilometres and a secondary just past the shopping centre. It is a residential road, so the evenings are quiet apart from the odd matatu on the main road.' },
      { from: 'sender', body: 'That sounds right for us. How soon could we view? We are in Nairobi the week of the 14th.' },
      { from: 'agent', body: 'Any day that week works. Give me two days notice so I can confirm with the current tenant, who is still in until the end of the month.' },
      { from: 'sender', body: 'Wednesday the 16th, late morning, if that suits. I will confirm the exact time once our travel is booked.' },
    ],
  },
  {
    fits: forSale,
    status: 'replied',
    message:
      'What is the state of the roof and the plumbing? The photographs look well kept but the building is not new, and I would rather know now than after a survey.',
    replies: [
      { from: 'agent', body: 'The roof was redone about four years ago and the owner has the invoice. The plumbing is original, and the main bathroom was refitted at the same time as the roof. Nothing is hidden, and I would encourage a survey either way.' },
      { from: 'sender', body: 'Appreciated, that is a straight answer. Could I bring a surveyor on the second viewing?' },
      { from: 'agent', body: 'Of course. Let me know who is coming and I will arrange access for a couple of hours rather than the usual half hour.' },
    ],
  },
  {
    fits: residential,
    status: 'closed',
    message:
      'Could you confirm the exact floor and whether the lift is working? I am asking because of my mother, who cannot manage stairs.',
    replies: [
      { from: 'agent', body: 'It is on the third floor and both lifts are in service, with the service contract current. There is also a ramp at the entrance.' },
      { from: 'sender', body: 'Thank you for checking. We have taken something on the ground floor elsewhere, but I am grateful for your time.' },
    ],
  },
  {
    fits: toLet,
    status: 'new',
    message:
      'Is the rent negotiable for a two year lease? I am a long-term tenant and would rather commit and settle.',
    replies: [],
  },
];

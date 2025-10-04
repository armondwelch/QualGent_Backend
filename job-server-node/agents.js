const agents = [
  { id: 'device1', target: 'android', busy: false },
  { id: 'device2', target: 'ios', busy: false }
];

exports.getAvailableAgent = (target) => {
  return agents.find(a => a.target === target && !a.busy);
};

exports.setBusy = (id, busy) => {
  const agent = agents.find(a => a.id === id);
  if (agent) agent.busy = busy;
};

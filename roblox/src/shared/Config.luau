--!strict
-- Tuning knobs for Flee the Balrog. Change these to make rounds easier or harder.

local Config = {
	MinPlayers = 1,
	IntermissionSeconds = 15,
	RoundSeconds = 180,
	PostRoundSeconds = 5,

	-- The shaft is rebuilt every round with a fresh random climb.
	ShaftOrigin = Vector3.new(0, 0, 0),
	ShaftHeight = 420,
	ShaftRadius = 38,
	LobbyOrigin = Vector3.new(0, 0, 300),

	-- The lava (and the Balrog riding it) start below the shaft floor,
	-- wait a moment, then rise faster and faster.
	LavaStartY = -12,
	LavaDelaySeconds = 8,
	LavaBaseSpeed = 1.4, -- studs per second
	LavaSpeedGain = 0.012, -- extra studs per second, per second

	EmberInterval = 1.1, -- seconds between embers at the start of a round
	EmberDamage = 20,

	RuneCount = 45,
	EscapeReward = 25,

	WardRadius = 22,
	WardCooldown = 12,

	StudsPerFathom = 2,
	DataStoreName = "FleeTheBalrog_v1",
}

return Config

--!strict
-- Runs the round loop: intermission in the lobby, then everyone is dropped into a
-- freshly built shaft and must climb to the escape gate before the lava catches them.

local Debris = game:GetService("Debris")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage.Shared.Config)
local DataService = require(script.Parent.DataService)
local ShaftBuilder = require(script.Parent.ShaftBuilder)
local World = require(script.Parent.World)

local Remotes = ReplicatedStorage.Remotes
local Notify = Remotes.Notify :: RemoteEvent
local CastWard = Remotes.CastWard :: RemoteEvent
local State = ReplicatedStorage.GameState

local rng = Random.new()
local lobbyCFrame = World.build()
DataService.start()

-- Players still climbing in the current round.
local active: { [Player]: boolean } = {}
local shaft: ShaftBuilder.Shaft? = nil
local lavaTop = Config.LavaStartY

State:SetAttribute("Status", "Starting...")
State:SetAttribute("TimeLeft", 0)
State:SetAttribute("InRound", false)
State:SetAttribute("LavaTop", lavaTop)
State:SetAttribute("GoalY", Config.ShaftOrigin.Y + Config.ShaftHeight)

local function notify(target: Player?, text: string, kind: string)
	if target then
		Notify:FireClient(target, text, kind)
	else
		Notify:FireAllClients(text, kind)
	end
end

local function setStatus(text: string, timeLeft: number)
	State:SetAttribute("Status", text)
	State:SetAttribute("TimeLeft", timeLeft)
end

local function rootOf(player: Player): BasePart?
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if not character or not humanoid or humanoid.Health <= 0 then
		return nil
	end
	return (character :: Model):FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function playerFromHit(hit: BasePart): Player?
	local model = hit:FindFirstAncestorOfClass("Model")
	return if model then Players:GetPlayerFromCharacter(model) else nil
end

local function leaveRound(player: Player)
	active[player] = nil
	player:SetAttribute("InRound", false)
end

local function sendToLobby(player: Player)
	local character = player.Character
	if character and rootOf(player) then
		character:PivotTo(lobbyCFrame * CFrame.new(rng:NextNumber(-8, 8), 0, rng:NextNumber(-4, 4)))
	end
end

local function onCharacterAdded(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid") :: Humanoid
	humanoid.Died:Connect(function()
		if active[player] then
			leaveRound(player)
			notify(player, "The Balrog claims you... you'll rise again next round.", "lose")
		end
	end)
end

local function onPlayerAdded(player: Player)
	player:SetAttribute("InRound", false)
	player.CharacterAdded:Connect(function(character)
		onCharacterAdded(player, character)
	end)
	if player.Character then
		task.spawn(onCharacterAdded, player, player.Character)
	end
end

Players.PlayerAdded:Connect(onPlayerAdded)
for _, player in Players:GetPlayers() do
	onPlayerAdded(player)
end

Players.PlayerRemoving:Connect(function(player)
	active[player] = nil
end)

--------------------------------------------------------------------------------
-- Hazards and pickups

local function spawnEmber(current: ShaftBuilder.Shaft)
	local targets = {}
	for player in active do
		local root = rootOf(player)
		if root then
			table.insert(targets, root)
		end
	end
	if #targets == 0 then
		return
	end

	-- Drop it from above a random climber so it is always a threat to someone.
	local target = targets[rng:NextInteger(1, #targets)]
	local flat = Vector2.new(target.Position.X + rng:NextNumber(-14, 14), target.Position.Z + rng:NextNumber(-14, 14))
	local limit = Config.ShaftRadius - 2
	if flat.Magnitude > limit then
		flat = flat.Unit * limit
	end

	local ember = Instance.new("Part")
	ember.Name = "Ember"
	ember.Shape = Enum.PartType.Ball
	ember.Size = Vector3.one * rng:NextNumber(1.5, 2.6)
	ember.Material = Enum.Material.Neon
	ember.Color = Color3.fromRGB(255, rng:NextInteger(90, 150), 30)
	ember.CanCollide = false
	ember.CastShadow = false
	ember.Position = Vector3.new(flat.X, target.Position.Y + rng:NextNumber(45, 60), flat.Y)
	local fire = Instance.new("Fire")
	fire.Size = 3
	fire.Heat = 0
	fire.Parent = ember
	ember.Parent = current.Embers
	ember:SetNetworkOwner(nil)
	ember.AssemblyLinearVelocity = Vector3.new(0, -25, 0)

	local spent = false
	ember.Touched:Connect(function(hit)
		local player = if spent then nil else playerFromHit(hit)
		if not player or not active[player] then
			return
		end
		local humanoid = ((player :: Player).Character :: Model):FindFirstChildOfClass("Humanoid")
		if humanoid then
			spent = true
			humanoid:TakeDamage(Config.EmberDamage)
			ember:Destroy()
		end
	end)
	Debris:AddItem(ember, 6)
end

local function hookPickups(current: ShaftBuilder.Shaft)
	for _, rune in current.Runes do
		rune.Touched:Connect(function(hit)
			local player = if rune.Parent then playerFromHit(hit) else nil
			if player and active[player] then
				rune:Destroy()
				DataService.addRunes(player, 1)
				notify(player, "+1 rune", "rune")
			end
		end)
	end

	current.Goal.Touched:Connect(function(hit)
		local hitPlayer = playerFromHit(hit)
		if not hitPlayer or not active[hitPlayer] then
			return
		end
		local player = hitPlayer :: Player
		leaveRound(player)
		DataService.addWin(player)
		DataService.addRunes(player, Config.EscapeReward)
		notify(player, ("You escaped the Balrog! +%d runes"):format(Config.EscapeReward), "win")
		for _, other in Players:GetPlayers() do
			if other ~= player then
				notify(other, player.DisplayName .. " escaped the Balrog!", "info")
			end
		end
		task.delay(2, function()
			if not player:GetAttribute("InRound") then
				sendToLobby(player)
			end
		end)
	end)
end

CastWard.OnServerEvent:Connect(function(player)
	local now = workspace:GetServerTimeNow()
	local readyAt = (player:GetAttribute("WardReadyAt") :: number?) or 0
	local maybeRoot = rootOf(player)
	if now < readyAt or not maybeRoot then
		return
	end
	local root = maybeRoot :: BasePart
	player:SetAttribute("WardReadyAt", now + Config.WardCooldown)

	local current = shaft
	if current then
		for _, ember in current.Embers:GetChildren() do
			if ember:IsA("BasePart") and (ember.Position - root.Position).Magnitude <= Config.WardRadius then
				ember:Destroy()
			end
		end
	end

	local burst = Instance.new("Part")
	burst.Name = "Ward"
	burst.Shape = Enum.PartType.Ball
	burst.Anchored = true
	burst.CanCollide = false
	burst.CanTouch = false
	burst.CanQuery = false
	burst.CastShadow = false
	burst.Material = Enum.Material.ForceField
	burst.Color = Color3.fromRGB(140, 210, 255)
	burst.Size = Vector3.one * 2
	burst.Position = root.Position
	burst.Parent = workspace
	TweenService:Create(burst, TweenInfo.new(0.5, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.one * Config.WardRadius * 2,
		Transparency = 1,
	}):Play()
	Debris:AddItem(burst, 0.6)
end)

--------------------------------------------------------------------------------
-- Round loop

local function countActive(): number
	local count = 0
	for _ in active do
		count += 1
	end
	return count
end

local function runRound()
	local current = ShaftBuilder.build()
	shaft = current
	lavaTop = Config.LavaStartY
	State:SetAttribute("LavaTop", lavaTop)
	State:SetAttribute("GoalY", current.GoalY)
	hookPickups(current)

	table.clear(active)
	local slot = 0
	for _, player in Players:GetPlayers() do
		local character = player.Character
		if character and rootOf(player) then
			slot += 1
			active[player] = true
			player:SetAttribute("InRound", true)
			player:SetAttribute("WardReadyAt", 0)
			character:PivotTo(current.SpawnPoints[(slot - 1) % #current.SpawnPoints + 1])
		end
	end
	State:SetAttribute("InRound", true)
	notify(nil, "The Balrog wakes. CLIMB!", "warn")

	local elapsed = 0
	local emberClock = 0
	local publishClock = 0
	local heartbeat = RunService.Heartbeat:Connect(function(dt)
		elapsed += dt

		if elapsed > Config.LavaDelaySeconds then
			local t = elapsed - Config.LavaDelaySeconds
			lavaTop += (Config.LavaBaseSpeed + Config.LavaSpeedGain * t) * dt
			ShaftBuilder.setLavaTop(current, lavaTop)
		end

		publishClock += dt
		if publishClock >= 0.1 then
			publishClock = 0
			State:SetAttribute("LavaTop", lavaTop)
		end

		-- Embers fall faster as the round goes on.
		emberClock += dt
		if emberClock >= Config.EmberInterval / (1 + elapsed / 60) then
			emberClock = 0
			spawnEmber(current)
		end

		-- Anyone whose feet sink below the lava is done.
		for player in active do
			local root = rootOf(player)
			if root and root.Position.Y - 2.5 < lavaTop then
				local humanoid = (player.Character :: Model):FindFirstChildOfClass("Humanoid")
				if humanoid then
					humanoid.Health = 0
				end
			end
		end
	end)

	while elapsed < Config.RoundSeconds and countActive() > 0 do
		setStatus(("Escape the Balrog! %d climbing"):format(countActive()), math.ceil(Config.RoundSeconds - elapsed))
		task.wait(0.25)
	end
	heartbeat:Disconnect()

	-- Whoever is still climbing when time runs out is swallowed by the dark.
	for player in active do
		notify(player, "Time's up! The shadow swallows the shaft.", "lose")
		leaveRound(player)
		sendToLobby(player)
	end
	State:SetAttribute("InRound", false)

	for t = Config.PostRoundSeconds, 1, -1 do
		setStatus("Round over", t)
		task.wait(1)
	end
	current.Folder:Destroy()
	shaft = nil
end

while true do
	while #Players:GetPlayers() < Config.MinPlayers do
		setStatus(("Waiting for players (%d/%d)"):format(#Players:GetPlayers(), Config.MinPlayers), 0)
		task.wait(1)
	end
	for t = Config.IntermissionSeconds, 1, -1 do
		setStatus("Next climb starts in", t)
		task.wait(1)
	end
	runRound()
end

--!strict
-- Keeps each player's Runes and Wins in leaderstats and saves them to a DataStore.
-- In Studio, saving needs "Enable Studio Access to API Services" (Game Settings > Security).

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local AUTOSAVE_SECONDS = 120

local DataService = {}

local store: DataStore? = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(Config.DataStoreName)
	end)
	if ok then
		store = result
	else
		warn("[DataService] DataStores unavailable, progress will not be saved:", result)
	end
end

-- Only players whose data loaded cleanly get saved, so a failed load never wipes progress.
local loaded: { [Player]: boolean } = {}

local function keyFor(player: Player): string
	return "player_" .. player.UserId
end

local function stat(player: Player, name: string): IntValue?
	local leaderstats = player:FindFirstChild("leaderstats")
	return leaderstats and leaderstats:FindFirstChild(name) :: IntValue?
end

local function load(player: Player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	local runes = Instance.new("IntValue")
	runes.Name = "Runes"
	runes.Parent = leaderstats
	local wins = Instance.new("IntValue")
	wins.Name = "Wins"
	wins.Parent = leaderstats
	leaderstats.Parent = player

	if not store then
		return
	end
	local dataStore = store :: DataStore
	local ok, data = pcall(function()
		return dataStore:GetAsync(keyFor(player))
	end)
	if not ok then
		warn("[DataService] Could not load", player.Name, data)
		return
	end
	if type(data) == "table" then
		runes.Value = tonumber(data.Runes) or 0
		wins.Value = tonumber(data.Wins) or 0
	end
	loaded[player] = true
end

function DataService.save(player: Player)
	local runes, wins = stat(player, "Runes"), stat(player, "Wins")
	if not store or not loaded[player] or not runes or not wins then
		return
	end
	local dataStore = store :: DataStore
	local data = { Runes = (runes :: IntValue).Value, Wins = (wins :: IntValue).Value }
	local ok, err = pcall(function()
		dataStore:SetAsync(keyFor(player), data)
	end)
	if not ok then
		warn("[DataService] Could not save", player.Name, err)
	end
end

function DataService.addRunes(player: Player, amount: number)
	local runes = stat(player, "Runes")
	if runes then
		runes.Value += amount
	end
end

function DataService.addWin(player: Player)
	local wins = stat(player, "Wins")
	if wins then
		wins.Value += 1
	end
end

function DataService.start()
	Players.PlayerAdded:Connect(load)
	for _, player in Players:GetPlayers() do
		task.spawn(load, player)
	end

	Players.PlayerRemoving:Connect(function(player)
		DataService.save(player)
		loaded[player] = nil
	end)

	game:BindToClose(function()
		local pending = 0
		for _, player in Players:GetPlayers() do
			pending += 1
			task.spawn(function()
				DataService.save(player)
				pending -= 1
			end)
		end
		while pending > 0 do
			task.wait()
		end
	end)

	task.spawn(function()
		while true do
			task.wait(AUTOSAVE_SECONDS)
			for _, player in Players:GetPlayers() do
				task.spawn(DataService.save, player)
			end
		end
	end)
end

return DataService

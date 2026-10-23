--!strict
-- Builds the things that last the whole server: lighting and the lobby.

local Lighting = game:GetService("Lighting")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local World = {}

local function part(parent: Instance, props: { [string]: any }): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in props do
		(p :: any)[key] = value
	end
	p.Parent = parent
	return p
end

local function torch(parent: Instance, position: Vector3)
	local flame = part(parent, {
		Name = "Torch",
		Size = Vector3.new(1, 1, 1),
		Position = position,
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(255, 140, 40),
		CanCollide = false,
	})
	local light = Instance.new("PointLight")
	light.Color = Color3.fromRGB(255, 150, 70)
	light.Range = 22
	light.Brightness = 2
	light.Parent = flame
	local fire = Instance.new("Fire")
	fire.Size = 2
	fire.Heat = 4
	fire.Parent = flame
end

local function setUpLighting()
	Lighting.ClockTime = 0
	Lighting.Brightness = 1
	Lighting.Ambient = Color3.fromRGB(45, 30, 30)
	Lighting.OutdoorAmbient = Color3.fromRGB(60, 40, 40)
	Lighting.EnvironmentDiffuseScale = 0.2
	Lighting.EnvironmentSpecularScale = 0.2

	local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
	atmosphere.Density = 0.35
	atmosphere.Color = Color3.fromRGB(120, 60, 40)
	atmosphere.Decay = Color3.fromRGB(60, 20, 10)
	atmosphere.Glare = 0
	atmosphere.Haze = 2
	atmosphere.Parent = Lighting

	local bloom = Lighting:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect")
	bloom.Intensity = 0.8
	bloom.Size = 30
	bloom.Threshold = 0.9
	bloom.Parent = Lighting
end

-- Returns the CFrame where players should stand when sent back to the lobby.
function World.build(): CFrame
	setUpLighting()

	local folder = Instance.new("Folder")
	folder.Name = "Lobby"
	folder.Parent = workspace

	local origin = Config.LobbyOrigin
	local stone = Color3.fromRGB(70, 66, 64)

	part(folder, {
		Name = "Floor",
		Size = Vector3.new(70, 2, 70),
		Position = origin + Vector3.new(0, -1, 0),
		Material = Enum.Material.Slate,
		Color = stone,
	})

	-- Low walls so nobody wanders off the edge.
	for _, side in { Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0), Vector3.new(0, 0, 1), Vector3.new(0, 0, -1) } do
		local size = if side.X ~= 0 then Vector3.new(2, 6, 70) else Vector3.new(70, 6, 2)
		part(folder, {
			Name = "Wall",
			Size = size,
			Position = origin + side * 34 + Vector3.new(0, 3, 0),
			Material = Enum.Material.Cobblestone,
			Color = stone,
		})
	end

	for _, corner in { Vector3.new(1, 0, 1), Vector3.new(-1, 0, 1), Vector3.new(1, 0, -1), Vector3.new(-1, 0, -1) } do
		local base = origin + corner * 28
		part(folder, {
			Name = "Pillar",
			Size = Vector3.new(4, 16, 4),
			Position = base + Vector3.new(0, 8, 0),
			Material = Enum.Material.Cobblestone,
			Color = Color3.fromRGB(55, 52, 50),
		})
		torch(folder, base + Vector3.new(0, 16.5, 0))
	end

	-- A big sign facing the spawn.
	local sign = part(folder, {
		Name = "Sign",
		Size = Vector3.new(40, 14, 2),
		Position = origin + Vector3.new(0, 12, -32),
		Material = Enum.Material.Basalt,
		Color = Color3.fromRGB(35, 28, 26),
	})
	local surface = Instance.new("SurfaceGui")
	surface.Face = Enum.NormalId.Back
	surface.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	surface.PixelsPerStud = 25
	surface.LightInfluence = 0
	surface.Parent = sign
	local title = Instance.new("TextLabel")
	title.Size = UDim2.fromScale(1, 0.6)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.Fantasy
	title.TextScaled = true
	title.TextColor3 = Color3.fromRGB(255, 170, 70)
	title.Text = "FLEE THE BALROG"
	title.Parent = surface
	local subtitle = title:Clone()
	subtitle.Position = UDim2.fromScale(0, 0.6)
	subtitle.Size = UDim2.fromScale(1, 0.3)
	subtitle.Font = Enum.Font.Gotham
	subtitle.TextColor3 = Color3.fromRGB(230, 220, 210)
	subtitle.Text = "Climb out of the deep before the fire reaches you"
	subtitle.Parent = surface

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "LobbySpawn"
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.Position = origin + Vector3.new(0, 0.5, 0)
	spawn.Material = Enum.Material.Marble
	spawn.Color = Color3.fromRGB(200, 190, 175)
	spawn.TopSurface = Enum.SurfaceType.Smooth
	spawn.Parent = folder

	return CFrame.new(origin + Vector3.new(0, 4, 6))
end

return World

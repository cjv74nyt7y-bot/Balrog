--!strict
-- Builds a fresh shaft each round: walls, a random climb of platforms, runes,
-- the escape gate at the top, the lava and the Balrog riding up on it.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Shared.Config)

local LAVA_THICKNESS = 40

export type Shaft = {
	Folder: Folder,
	Embers: Folder,
	Lava: Part,
	Balrog: Model,
	BalrogBase: CFrame,
	Goal: Part,
	GoalY: number,
	Runes: { Part },
	SpawnPoints: { CFrame },
}

local ShaftBuilder = {}

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

-- Decoration that nothing should touch, hit or ray-cast against.
local function ghost(p: Part): Part
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	return p
end

-- Crumbling platforms flash when stepped on, drop away, then come back.
local function makeCrumbling(p: Part)
	local busy = false
	local color = p.Color
	p.Touched:Connect(function(hit)
		if busy then
			return
		end
		local model = hit:FindFirstAncestorOfClass("Model")
		if not (model and model:FindFirstChildOfClass("Humanoid")) then
			return
		end
		busy = true
		p.Color = Color3.fromRGB(255, 120, 40)
		task.wait(0.7)
		if not p.Parent then
			return
		end
		p.Transparency = 0.85
		p.CanCollide = false
		task.wait(3)
		if not p.Parent then
			return
		end
		p.Transparency = 0
		p.CanCollide = true
		p.Color = color
		busy = false
	end)
end

local function buildWalls(folder: Folder, origin: Vector3)
	local segments = 28
	local radius = Config.ShaftRadius + 3
	local bottom = -30
	local height = Config.ShaftHeight + 90
	local width = 2 * math.pi * radius / segments + 1
	local rock = Color3.fromRGB(48, 40, 38)

	for i = 1, segments do
		local angle = (i / segments) * 2 * math.pi
		local position = origin + Vector3.new(math.cos(angle) * radius, bottom + height / 2, math.sin(angle) * radius)
		local center = Vector3.new(origin.X, position.Y, origin.Z)
		part(folder, {
			Name = "Wall",
			Size = Vector3.new(width, height, 4),
			CFrame = CFrame.lookAt(position, center),
			Material = Enum.Material.Basalt,
			Color = rock,
		})

		-- Torches climb the walls so the shaft is never fully dark.
		if i % 7 == 0 then
			for y = 30, Config.ShaftHeight, 60 do
				local torchPos = origin
					+ Vector3.new(math.cos(angle) * (radius - 2.5), y + (i % 2) * 30, math.sin(angle) * (radius - 2.5))
				local flame = ghost(part(folder, {
					Name = "Torch",
					Size = Vector3.new(1, 1.4, 1),
					Position = torchPos,
					Material = Enum.Material.Neon,
					Color = Color3.fromRGB(255, 140, 40),
				}))
				local light = Instance.new("PointLight")
				light.Color = Color3.fromRGB(255, 150, 70)
				light.Range = 30
				light.Brightness = 1.6
				light.Parent = flame
			end
		end
	end

	local floorSize = 2 * radius + 8
	part(folder, {
		Name = "Floor",
		Size = Vector3.new(floorSize, 2, floorSize),
		Position = origin + Vector3.new(0, -1, 0),
		Material = Enum.Material.Basalt,
		Color = Color3.fromRGB(40, 34, 32),
	})

	-- Daylight far above: the way out.
	local sky = ghost(part(folder, {
		Name = "Daylight",
		Size = Vector3.new(2 * radius, 1, 2 * radius),
		Position = origin + Vector3.new(0, Config.ShaftHeight + 58, 0),
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(255, 244, 214),
	}))
	local sun = Instance.new("SurfaceLight")
	sun.Face = Enum.NormalId.Bottom
	sun.Range = 60
	sun.Angle = 120
	sun.Brightness = 3
	sun.Color = Color3.fromRGB(255, 240, 210)
	sun.Parent = sky
end

-- Random walk upward. Each hop is always jumpable, but hops get longer,
-- platforms get smaller and more of them crumble the higher you go.
local function buildPlatforms(folder: Folder, origin: Vector3, rng: Random): ({ Part }, Part)
	local platforms: { Part } = {}
	local x, z, y = 0, 0, 0
	local lastSize = 14
	local limit = Config.ShaftRadius - 8

	local function nextSpot(size: number, progress: number): (number, number)
		local gap = rng:NextNumber(1, 2 + 2 * progress)
		local distance = (lastSize + size) / 2 + gap
		local angle = rng:NextNumber(0, 2 * math.pi)
		local nx, nz = x + math.cos(angle) * distance, z + math.sin(angle) * distance
		if Vector2.new(nx, nz).Magnitude > limit then
			-- Turn back toward the middle of the shaft.
			angle = math.atan2(-z, -x) + rng:NextNumber(-0.7, 0.7)
			nx, nz = x + math.cos(angle) * distance, z + math.sin(angle) * distance
		end
		return nx, nz
	end

	-- Stop a short hop below the top so the last jump onto the gate is easy too.
	while Config.ShaftHeight - y > 4.5 do
		local progress = y / Config.ShaftHeight
		y += math.min(rng:NextNumber(3, 3.5 + 1.2 * progress), Config.ShaftHeight - y - 2.5)
		local size = math.max(5, 10 - 4 * progress + rng:NextNumber(-1, 1))
		x, z = nextSpot(size, progress)
		lastSize = size

		local crumbles = progress > 0.25 and rng:NextNumber() < 0.1 + 0.3 * progress
		local hue = rng:NextNumber(-8, 8)
		local p = part(folder, {
			Name = if crumbles then "Crumbling" else "Ledge",
			Size = Vector3.new(size, 1.2, size * rng:NextNumber(0.75, 1)),
			CFrame = CFrame.new(origin + Vector3.new(x, y, z)) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0),
			Material = if crumbles then Enum.Material.CrackedLava else Enum.Material.Slate,
			Color = if crumbles
				then Color3.fromRGB(120, 70, 50)
				else Color3.fromRGB(100 + hue, 94 + hue, 90 + hue),
		})
		if crumbles then
			makeCrumbling(p)
		end
		table.insert(platforms, p)
	end

	-- The escape gate: a wide golden ledge at the very top.
	y = Config.ShaftHeight
	x, z = nextSpot(16, 1)
	local goal = part(folder, {
		Name = "EscapeGate",
		Size = Vector3.new(16, 1.2, 16),
		Position = origin + Vector3.new(x, y, z),
		Material = Enum.Material.Foil,
		Color = Color3.fromRGB(240, 196, 90),
	})
	local ring = ghost(part(folder, {
		Name = "GateRing",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.6, 14, 14),
		CFrame = CFrame.new(goal.Position + Vector3.new(0, 7.6, 0)),
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(255, 225, 140),
		Transparency = 0.3,
	}))
	local glow = Instance.new("PointLight")
	glow.Color = Color3.fromRGB(255, 225, 150)
	glow.Range = 40
	glow.Brightness = 3
	glow.Parent = ring

	local billboard = Instance.new("BillboardGui")
	billboard.Size = UDim2.fromOffset(220, 60)
	billboard.StudsOffset = Vector3.new(0, 16, 0)
	billboard.AlwaysOnTop = true
	billboard.MaxDistance = 200
	billboard.Parent = goal
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.Fantasy
	label.TextScaled = true
	label.TextColor3 = Color3.fromRGB(255, 225, 140)
	label.TextStrokeTransparency = 0.4
	label.Text = "ESCAPE"
	label.Parent = billboard

	return platforms, goal
end

local function buildRunes(folder: Folder, platforms: { Part }, rng: Random): { Part }
	local candidates = {}
	for i = 3, #platforms do
		table.insert(candidates, platforms[i])
	end
	local runes: { Part } = {}
	for _ = 1, math.min(Config.RuneCount, #candidates) do
		local platform = table.remove(candidates, rng:NextInteger(1, #candidates)) :: Part
		local rune = part(folder, {
			Name = "Rune",
			Size = Vector3.new(1.4, 1.4, 0.4),
			CFrame = CFrame.new(platform.Position + Vector3.new(0, 3, 0))
				* CFrame.Angles(0, rng:NextNumber(0, math.pi), math.rad(45)),
			Material = Enum.Material.Neon,
			Color = Color3.fromRGB(120, 220, 255),
			CanCollide = false,
		})
		local light = Instance.new("PointLight")
		light.Color = rune.Color
		light.Range = 8
		light.Parent = rune
		table.insert(runes, rune)
	end
	return runes
end

local function buildBalrog(folder: Folder, base: CFrame): Model
	local model = Instance.new("Model")
	model.Name = "Balrog"

	local shadow = Color3.fromRGB(30, 18, 16)
	local function piece(name: string, size: Vector3, offset: CFrame, props: { [string]: any }?): Part
		local p = ghost(part(model, {
			Name = name,
			Size = size,
			CFrame = base * offset,
			Material = Enum.Material.Slate,
			Color = shadow,
		}))
		if props then
			for key, value in props do
				(p :: any)[key] = value
			end
		end
		return p
	end

	local body = piece("Body", Vector3.new(16, 26, 9), CFrame.new())
	piece("Head", Vector3.new(8, 8, 8), CFrame.new(0, 17, 0))
	for _, side in { -1, 1 } do
		piece("Eye", Vector3.new(1.6, 0.9, 0.4), CFrame.new(side * 1.8, 18, -4.1), {
			Material = Enum.Material.Neon,
			Color = Color3.fromRGB(255, 220, 60),
		})
		piece("Horn", Vector3.new(1.4, 7, 1.4), CFrame.new(side * 4.4, 23, 0) * CFrame.Angles(0, 0, math.rad(-side * 25)))
		piece("Wing", Vector3.new(1.5, 20, 26), CFrame.new(side * 10, 8, 6) * CFrame.Angles(math.rad(20), 0, math.rad(side * 30)), {
			Transparency = 0.15,
		})
		piece("Arm", Vector3.new(4, 18, 4), CFrame.new(side * 10, 2, -2) * CFrame.Angles(math.rad(-30), 0, 0))
	end

	local fire = Instance.new("Fire")
	fire.Size = 14
	fire.Heat = 12
	fire.Color = Color3.fromRGB(255, 110, 30)
	fire.SecondaryColor = Color3.fromRGB(255, 200, 60)
	fire.Parent = body

	model.PrimaryPart = body
	model.Parent = folder
	return model
end

function ShaftBuilder.build(): Shaft
	local origin = Config.ShaftOrigin
	local rng = Random.new()

	local folder = Instance.new("Folder")
	folder.Name = "Shaft"

	buildWalls(folder, origin)
	local platforms, goal = buildPlatforms(folder, origin, rng)
	local runes = buildRunes(folder, platforms, rng)

	local lavaSize = 2 * Config.ShaftRadius + 10
	local lava = ghost(part(folder, {
		Name = "Lava",
		Size = Vector3.new(lavaSize, LAVA_THICKNESS, lavaSize),
		Material = Enum.Material.CrackedLava,
		Color = Color3.fromRGB(255, 90, 20),
	}))
	local top = Instance.new("Attachment")
	top.Position = Vector3.new(0, LAVA_THICKNESS / 2 + 2, 0)
	top.Parent = lava
	local glow = Instance.new("PointLight")
	glow.Color = Color3.fromRGB(255, 110, 40)
	glow.Range = 60
	glow.Brightness = 4
	glow.Parent = top

	-- The Balrog stands against the far wall, facing the climbers.
	local balrogSpot = Vector3.new(origin.X, -2, origin.Z - (Config.ShaftRadius - 7))
	local balrogBase = CFrame.lookAt(balrogSpot, Vector3.new(origin.X, -2, origin.Z))
	local balrog = buildBalrog(folder, balrogBase)

	local embers = Instance.new("Folder")
	embers.Name = "Embers"
	embers.Parent = folder

	local spawnPoints = {}
	for i = 1, 12 do
		local angle = (i / 12) * 2 * math.pi
		local position = origin + Vector3.new(math.cos(angle) * 10, 4, math.sin(angle) * 10)
		table.insert(spawnPoints, CFrame.lookAt(position, Vector3.new(origin.X, position.Y, origin.Z)))
	end

	folder.Parent = workspace

	local shaft: Shaft = {
		Folder = folder,
		Embers = embers,
		Lava = lava,
		Balrog = balrog,
		BalrogBase = balrogBase,
		Goal = goal,
		GoalY = origin.Y + Config.ShaftHeight,
		Runes = runes,
		SpawnPoints = spawnPoints,
	}
	ShaftBuilder.setLavaTop(shaft, Config.LavaStartY)
	return shaft
end

function ShaftBuilder.setLavaTop(shaft: Shaft, y: number)
	local origin = Config.ShaftOrigin
	shaft.Lava.CFrame = CFrame.new(origin.X, y - LAVA_THICKNESS / 2, origin.Z)
	shaft.Balrog:PivotTo(shaft.BalrogBase + Vector3.new(0, y, 0))
end

return ShaftBuilder

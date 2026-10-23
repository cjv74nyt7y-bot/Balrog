--!strict
-- On-screen HUD: round status, a climb meter showing you vs. the lava,
-- a red glow when the fire is close, pop-up messages and the Ward button.

local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local SoundService = game:GetService("SoundService")
local TweenService = game:GetService("TweenService")

local Config = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Config"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local Notify = Remotes:WaitForChild("Notify") :: RemoteEvent
local CastWard = Remotes:WaitForChild("CastWard") :: RemoteEvent
local State = ReplicatedStorage:WaitForChild("GameState")

local player = Players.LocalPlayer

local FIRE = Color3.fromRGB(255, 140, 50)
local PARCHMENT = Color3.fromRGB(240, 228, 210)
local PANEL = Color3.fromRGB(20, 14, 12)

local function make(className: string, props: { [string]: any }, children: { any }?): any
	local instance = Instance.new(className)
	for key, value in props do
		if key ~= "Parent" then
			(instance :: any)[key] = value
		end
	end
	if children then
		for _, child in children do
			child.Parent = instance
		end
	end
	if props.Parent then
		instance.Parent = props.Parent
	end
	return instance
end

local function corner(radius: number): UICorner
	return make("UICorner", { CornerRadius = UDim.new(0, radius) })
end

local gui = make("ScreenGui", {
	Name = "BalrogHud",
	ResetOnSpawn = false,
	IgnoreGuiInset = true,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = player:WaitForChild("PlayerGui"),
})

-- Red glow around the screen edges when the lava is close.
local danger = make("Frame", {
	Name = "Danger",
	Size = UDim2.fromScale(1, 1),
	BackgroundColor3 = Color3.fromRGB(255, 60, 20),
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	Parent = gui,
}, {
	make("UIGradient", {
		Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 0),
			NumberSequenceKeypoint.new(0.25, 1),
			NumberSequenceKeypoint.new(0.75, 1),
			NumberSequenceKeypoint.new(1, 0),
		}),
		Rotation = 90,
	}),
})

local statusPanel = make("Frame", {
	Name = "Status",
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 52),
	Size = UDim2.fromOffset(360, 54),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.25,
	Parent = gui,
}, { corner(10), make("UIStroke", { Color = FIRE, Transparency = 0.4, Thickness = 1.5 }) })

local statusLabel = make("TextLabel", {
	Position = UDim2.fromOffset(14, 0),
	Size = UDim2.new(1, -90, 1, 0),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamMedium,
	TextSize = 18,
	TextColor3 = PARCHMENT,
	TextXAlignment = Enum.TextXAlignment.Left,
	TextTruncate = Enum.TextTruncate.AtEnd,
	Text = "",
	Parent = statusPanel,
})

local timerLabel = make("TextLabel", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -14, 0, 0),
	Size = UDim2.new(0, 70, 1, 0),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBold,
	TextSize = 26,
	TextColor3 = FIRE,
	TextXAlignment = Enum.TextXAlignment.Right,
	Text = "",
	Parent = statusPanel,
})

-- Climb meter on the right edge: the bar is the shaft, the gold dot is you.
local meter = make("Frame", {
	Name = "ClimbMeter",
	AnchorPoint = Vector2.new(1, 0.5),
	Position = UDim2.new(1, -24, 0.5, 0),
	Size = UDim2.fromOffset(16, 300),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.2,
	Visible = false,
	Parent = gui,
}, { corner(8) })

local lavaFill = make("Frame", {
	AnchorPoint = Vector2.new(0, 1),
	Position = UDim2.fromScale(0, 1),
	Size = UDim2.fromScale(1, 0),
	BackgroundColor3 = Color3.fromRGB(255, 90, 20),
	BorderSizePixel = 0,
	Parent = meter,
}, { corner(8) })

local youDot = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 1),
	Size = UDim2.fromOffset(24, 24),
	BackgroundColor3 = Color3.fromRGB(255, 220, 120),
	ZIndex = 2,
	Parent = meter,
}, { corner(12), make("UIStroke", { Color = PANEL, Thickness = 2 }) })

make("TextLabel", {
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 0, -6),
	Size = UDim2.fromOffset(80, 20),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBold,
	TextSize = 14,
	TextColor3 = Color3.fromRGB(255, 225, 140),
	Text = "ESCAPE",
	Parent = meter,
})

local depthLabel = make("TextLabel", {
	AnchorPoint = Vector2.new(1, 0.5),
	Position = UDim2.new(1, -52, 0.5, 0),
	Size = UDim2.fromOffset(160, 44),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamMedium,
	TextSize = 15,
	TextColor3 = PARCHMENT,
	TextXAlignment = Enum.TextXAlignment.Right,
	TextStrokeTransparency = 0.5,
	RichText = true,
	Visible = false,
	Text = "",
	Parent = gui,
})

local wardLabel = make("TextLabel", {
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -24),
	Size = UDim2.fromOffset(200, 32),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.3,
	Font = Enum.Font.GothamMedium,
	TextSize = 16,
	TextColor3 = Color3.fromRGB(150, 215, 255),
	Visible = false,
	Text = "",
	Parent = gui,
}, { corner(8) })

local toast = make("TextLabel", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.3),
	Size = UDim2.fromOffset(600, 50),
	BackgroundTransparency = 1,
	Font = Enum.Font.Fantasy,
	TextSize = 34,
	TextColor3 = PARCHMENT,
	TextStrokeTransparency = 0.3,
	TextTransparency = 1,
	TextStrokeColor3 = PANEL,
	TextWrapped = true,
	Text = "",
	Parent = gui,
})

local runePop = make("TextLabel", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.62),
	Size = UDim2.fromOffset(200, 30),
	BackgroundTransparency = 1,
	Font = Enum.Font.GothamBold,
	TextSize = 24,
	TextColor3 = Color3.fromRGB(120, 220, 255),
	TextStrokeTransparency = 0.4,
	TextTransparency = 1,
	Text = "",
	Parent = gui,
})

local pickupSound = make("Sound", {
	SoundId = "rbxasset://sounds/electronicpingshort.wav",
	Volume = 0.5,
	Parent = SoundService,
})

local TOAST_COLORS = {
	warn = FIRE,
	lose = Color3.fromRGB(255, 110, 90),
	win = Color3.fromRGB(255, 225, 140),
	info = PARCHMENT,
}

local toastTween: Tween? = nil
local function showToast(text: string, color: Color3)
	if toastTween then
		toastTween:Cancel()
	end
	toast.Text = text
	toast.TextColor3 = color
	toast.TextTransparency = 0
	toast.TextStrokeTransparency = 0.3
	toastTween = TweenService:Create(toast, TweenInfo.new(1, Enum.EasingStyle.Quad, Enum.EasingDirection.In, 0, false, 2.5), {
		TextTransparency = 1,
		TextStrokeTransparency = 1,
	})
	;(toastTween :: Tween):Play()
end

local runeStreak = 0
local runeTween: Tween? = nil
local function showRune(text: string)
	runeStreak += 1
	runePop.Text = if runeStreak > 1 then ("%s  x%d"):format(text, runeStreak) else text
	runePop.TextTransparency = 0
	runePop.TextStrokeTransparency = 0.4
	if runeTween then
		runeTween:Cancel()
	end
	local tween = TweenService:Create(runePop, TweenInfo.new(0.6, Enum.EasingStyle.Quad, Enum.EasingDirection.In, 0, false, 0.8), {
		TextTransparency = 1,
		TextStrokeTransparency = 1,
	})
	tween.Completed:Connect(function(playbackState)
		if playbackState == Enum.PlaybackState.Completed then
			runeStreak = 0
		end
	end)
	tween:Play()
	runeTween = tween
	pickupSound:Play()
end

Notify.OnClientEvent:Connect(function(text: string, kind: string)
	if kind == "rune" then
		showRune(text)
	else
		showToast(text, TOAST_COLORS[kind] or PARCHMENT)
	end
end)

ContextActionService:BindAction("CastWard", function(_, inputState)
	if inputState == Enum.UserInputState.Begin then
		CastWard:FireServer()
	end
	return Enum.ContextActionResult.Sink
end, true, Enum.KeyCode.E, Enum.KeyCode.ButtonX)
ContextActionService:SetTitle("CastWard", "Ward")

RunService.RenderStepped:Connect(function()
	local timeLeft = (State:GetAttribute("TimeLeft") :: number?) or 0
	statusLabel.Text = (State:GetAttribute("Status") :: string?) or ""
	timerLabel.Text = if timeLeft > 0 then ("%d:%02d"):format(timeLeft // 60, timeLeft % 60) else ""

	local inRound = player:GetAttribute("InRound") == true
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	meter.Visible = inRound and root ~= nil
	depthLabel.Visible = meter.Visible
	wardLabel.Visible = meter.Visible

	if not inRound or not root then
		danger.BackgroundTransparency = 1
		return
	end

	local floorY = Config.ShaftOrigin.Y
	local goalY = (State:GetAttribute("GoalY") :: number?) or (floorY + Config.ShaftHeight)
	local lavaTop = (State:GetAttribute("LavaTop") :: number?) or Config.LavaStartY
	local span = goalY - floorY
	local feet = root.Position.Y - 3

	youDot.Position = UDim2.fromScale(0.5, 1 - math.clamp((feet - floorY) / span, 0, 1))
	lavaFill.Size = UDim2.fromScale(1, math.clamp((lavaTop - floorY) / span, 0, 1))

	local toGo = math.max(0, goalY - feet) / Config.StudsPerFathom
	local gap = (feet - lavaTop) / Config.StudsPerFathom
	depthLabel.Text = ("%d fathoms to go\n<font color=\"#ff8a3c\">fire %d below</font>"):format(math.floor(toGo), math.floor(math.max(gap, 0)))

	-- Glow brightens from 15 fathoms away down to nothing.
	danger.BackgroundTransparency = math.clamp(gap / 15, 0.15, 1)

	local readyAt = (player:GetAttribute("WardReadyAt") :: number?) or 0
	local remaining = readyAt - workspace:GetServerTimeNow()
	wardLabel.Text = if remaining > 0 then ("Ward in %ds"):format(math.ceil(remaining)) else "Ward ready  [E]"
end)

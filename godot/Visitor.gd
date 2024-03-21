extends CharacterBody3D

var mouse_sensitivity := 0.1
const SPEED = 8.0
var gravity = ProjectSettings.get_setting("physics/3d/default_gravity")
var gravity_vector = ProjectSettings.get_setting("physics/3d/default_gravity_vector")
@onready var camera: Camera3D = $Camera3D

var total_rotation: Vector3:
	set(val):
		total_rotation = val
		rotation = total_rotation

var hud_scn := preload("res://ui/HUD.tscn")
var hud: VisitorHUD

var pid: int

class Interaction:
	extends RefCounted
	var id: StringName
	var action: Callable
var interaction: Interaction = null

var movement := Vector2()
var requested_rotation := Vector2()
var interact_requested := false
var interacting := false:
	set(val):
		interacting = val
		if multiplayer.get_unique_id() != pid:
			return
		if not jc.is_player_server():
			send_interacting.rpc_id(1, val)
		if val:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
		else:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)

var jc: JamConnect

func _ready():
	jc = JamRoot.get_jam_root(get_tree()).jam_connect
	total_rotation = rotation
	if multiplayer.get_unique_id() == pid:
		camera.current = true
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
		hud = hud_scn.instantiate()
		hud.start_painting.connect(_on_start_painting)
		hud.painting_ready.connect(_on_painting_ready)
		hud.done_painting.connect(_on_painting_done)
		add_child(hud)

func _input(event):
	if multiplayer.get_unique_id() != pid:
		return
		
	if interacting:
		return
		
	if event is InputEventMouseMotion:
		var r = -1 * Vector2(
			deg_to_rad(event.relative.y * mouse_sensitivity),
			deg_to_rad(event.relative.x * mouse_sensitivity)
		)
		if jc.is_player_server():
			requested_rotation += Vector2(r.x, r.y)
			requested_rotation.x = clampf(requested_rotation.x, -.15*PI, .1*PI)
		else:
			add_rotation.rpc_id(1, r)
		
	if event.is_action_pressed(&"ui_accept"):
		if interaction:
			if interaction.id == Painting.paint_init:
				interacting = true
				hud.show_painting_prompt()
			else:
				print_debug("accept pressed with wrong interaction ", interaction.id)
		else:
			print_debug("accept pressed without interaction")

func _physics_process(delta):
	# don't do physics if interacting
	if interacting:
		return
	
	if jc.is_player() and multiplayer.get_unique_id() == pid:
		var curr_move = Input.get_vector(&"ui_left", &"ui_right", &"ui_up", &"ui_down")
		if curr_move != movement:
			movement = curr_move
			
			if jc.is_player_server():
				movement = movement.normalized()
			else:
				set_movement.rpc_id(1, movement)
	
	if multiplayer.is_server():
		# Add the gravity.
		if not is_on_floor():
			velocity += gravity_vector * gravity * delta
		
		total_rotation = Vector3(requested_rotation.x, requested_rotation.y, 0)
		
		var movement3d := Vector3(movement.x, 0, movement.y)
		
		if movement3d.length_squared() > 0:
			movement3d = movement3d.rotated(Vector3(0, 1, 0), rotation.y)
			movement3d = movement3d.rotated(Vector3(-1, 0, 0), rotation.x)
			movement3d = movement3d.normalized() * SPEED
			
		velocity.z = movement3d.z
		velocity.x = movement3d.x

		move_and_slide()

func _on_start_painting():
	if interaction and interaction.id == Painting.paint_init:
		interaction.action.call(pid)
	else:
		printerr("unexpected action context for start painting signal")

func _on_painting_ready(pic_key: String):
	if interaction and interaction.id == Painting.paint_submit:
		interaction.action.call(pic_key)
	else:
		printerr("unexpected action context for painting ready signal")
		if interaction == null:
			printerr("null interaction")
		else:
			printerr("interaction id: ", interaction.id)

func _on_painting_done():
	interacting = false
	
@rpc("any_peer")
func set_movement(amount: Vector2):
	if multiplayer.get_remote_sender_id() != pid:
		return
	movement = amount.normalized()

@rpc("any_peer")
func add_rotation(amount: Vector2):
	if multiplayer.get_remote_sender_id() != pid:
		return
	requested_rotation += Vector2(amount.x, amount.y)
	requested_rotation.x = clampf(requested_rotation.x, -.15*PI, .1*PI)

@rpc("any_peer", "reliable")
func send_interacting(val: bool):
	if multiplayer.get_remote_sender_id() != pid:
		return
	interacting = val

@rpc("any_peer", "reliable")
func send_action(id: StringName, arg: Variant):
	if not (multiplayer.is_server() and multiplayer.get_remote_sender_id() == pid):
		return
	
	if not interaction or interaction.id != id:
		printerr("unavailable interaction requested from %d: " % pid, id)
	
	interaction.action.call(arg)

func _do_action(arg: Variant, id: StringName):
	if pid == 1:
		if not interaction or interaction.id != id:
			printerr("unavailable interaction requested: ", id)
		interaction.action.call(arg)
	else:
		send_action.rpc_id(1, id, arg)

func grant_action(id: StringName, c: Callable):
	interaction = Interaction.new()
	interaction.id = id
	interaction.action = c
	if pid != 1:
		send_grant_action.rpc_id(pid, id)

@rpc("reliable")
func send_grant_action(id: StringName):
	interaction = Interaction.new()
	interaction.id = id
	interaction.action = _do_action.bind(id)

func clear_action(id: StringName):
	if interaction and interaction.id == id:
		interaction = null
	
	if pid == 1:
		send_clear_action(id)
	else:
		send_clear_action.rpc_id(pid, id)

@rpc("reliable")
func send_clear_action(id: StringName):
	if interaction and interaction.id == id:
		interaction = null

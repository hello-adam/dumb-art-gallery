class_name Painting
extends Node3D

@onready var pic_req: HTTPRequest = $PictureReq
@onready var canvas_mesh: MeshInstance3D = $Canvas
@onready var spotlights: Node3D = $Spotlights
@onready var interact_area: Area3D = $Area3D
@onready var busy_view: Node3D = $Busy

const PICTURE_BUCKET = "dag-datapictures1c1f3cbd-bttjdxrg3lvd"

var action_grantees = []

const paint_init := &"paint_init"
const paint_submit := &"paint_submit"

var paint_busy: bool = false:
	set(val):
		paint_busy = val
		busy_view.visible = val
		spotlights.visible = painted or focused or paint_busy
		if multiplayer.is_server():
			for v in action_grantees:
				v.clear_action(paint_init)

var painted: bool = false:
	set(val):
		painted = val
		spotlights.visible = painted or focused or paint_busy
		if multiplayer.is_server():
			if painted:
				for v in action_grantees:
					v.clear_action(paint_init)
				action_grantees = []

var focused: bool = false:
	set(val):
		focused = val
		spotlights.visible = painted or focused or paint_busy

var picture_url: String = "":
	set(val):
		picture_url = val
		print("sending request!")
		var err = pic_req.request(val)
		if err != OK:
			push_error("failed to initiate picture request at url ", val)

var picture_key: String = "":
	set(val):
		picture_key = val
		if len(val) > 0:
			picture_url = _key_to_url(val)
			painted = true
		else:
			painted = false

func _key_to_url(picture_key: String) -> String:
	return "https://%s.s3.amazonaws.com/%s" % [PICTURE_BUCKET, picture_key]

func _ready():
	pass

# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta):
	pass

func init_painting(pid: int):
	if not multiplayer.is_server():
		return
	
	if pid != 1:
		if pid != multiplayer.get_remote_sender_id():
			return
		
	var painter = null
	for v in action_grantees:
		if v.pid == pid:
			painter = v
			break
	
	if painter == null:
		printerr("could not locate paint init caller among grantees")
		return
	
	painter.grant_action(paint_submit, submit_painting)
	paint_busy = true

func submit_painting(pic_key: String):
	if not multiplayer.is_server():
		return
		
	paint_busy = false
	picture_key = pic_key

func _on_area_3d_body_entered(body):
	if not multiplayer.is_server():
		return
	
	if painted or paint_busy:
		return
	
	if body.is_in_group(&"visitor"):
		body.grant_action(paint_init, init_painting)
		action_grantees.append(body)
		focused = true

func _on_area_3d_body_exited(body):
	if not multiplayer.is_server():
		return
	
	if painted or paint_busy:
		return
	
	if body.is_in_group(&"visitor"):
		body.clear_action(paint_init)
		action_grantees.erase(body)
		for other in interact_area.get_overlapping_bodies():
			if other.is_in_group(&"visitor"):
				return
		focused = false

func _on_picture_req_request_completed(result, response_code, headers, body):
	print("request complete!")
	if result != HTTPRequest.RESULT_SUCCESS or response_code > 299:
		push_error("Failed to get image")
		if multiplayer.is_server():
			painted = false
		return

	var image = Image.new()
	var error = image.load_jpg_from_buffer(body)
	if error != OK:
		push_error("Failed to load image")
		if multiplayer.is_server():
			painted = false
		return
	
	var texture = ImageTexture.create_from_image(image)
	var material: BaseMaterial3D = canvas_mesh.get_active_material(0)
	material.albedo_texture = texture

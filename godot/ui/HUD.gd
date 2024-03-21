class_name VisitorHUD
extends MarginContainer

@onready var pages: JamPageStack = $PageStack
@onready var prompt_page: Control = $PageStack/EnterPrompt
@onready var prompt_edit: TextEdit = $PageStack/EnterPrompt/VB/TextEdit

@onready var paint_req: HTTPRequest = $PaintReq

signal start_painting()
signal painting_ready(url: String)
signal done_painting()

var gjwt: String

func _ready():
	visible = false
	gjwt = JamRoot.get_jam_root(get_tree()).jam_connect.client.jwt.get_token()

func _process(delta):
	pass

func show_painting_prompt():
	pages.show_page_node(prompt_page, false)
	self.visible = true

func _on_prompt_submit_pressed():
	paint_req.request(
		"https://game.dumbartgallery.com/paint",
		[
			"Authorization: Bearer %s" % gjwt,
			"Content-Type: application/json"
		],
		HTTPClient.METHOD_POST,
		JSON.stringify({
			"prompt": prompt_edit.text
		}))
	prompt_edit.text = ""
	self.visible = false
	start_painting.emit()

func _on_paint_req_request_completed(result, response_code, headers, body: PackedByteArray):
	var bodyStr = body.get_string_from_utf8()
	var resp = JSON.parse_string(bodyStr)
	if resp == null:
		printerr("painting response not JSON - ", bodyStr)
		painting_ready.emit("")
	elif "key" not in resp:
		printerr("painting response missing 'key' - ", bodyStr)
		painting_ready.emit("")
	else:
		painting_ready.emit(resp["key"])
	done_painting.emit()

func _on_prompt_cancel_pressed():
	self.visible = false
	done_painting.emit()

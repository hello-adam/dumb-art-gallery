extends Node3D

var visitor_scn = preload("res://Visitor.tscn")
@onready var spawn_root = $SpawnPoints
@onready var visitor_root = $Visitors

var started: bool = false
var pending_players = []

func _ready():
	pass # Replace with function body.

func _process(delta):
	pass

func _on_jam_connect_player_verified(pid, pinfo):
	if started:
		_add_player(pid)
	else:
		pending_players.append(pid)

func _on_jam_connect_player_disconnected(pid, pinfo):
	if started:
		_remove_player(pid)
	else:
		pending_players.erase(pid)

func _on_jam_connect_game_init_finalized():
	started = true
	if multiplayer.is_server():
		for pid in pending_players:
			_add_player(pid)
		pending_players = []

func _add_player(pid: int):
	var v = visitor_scn.instantiate()
	v.pid = pid
	v.transform = spawn_root.get_children().pick_random().transform
	visitor_root.add_child(v, true)

func _remove_player(pid: int):
	for v in visitor_root.get_children():
		if v.pid == pid:
			v.queue_free()
			return

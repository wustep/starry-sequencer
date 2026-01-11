/**
 * Starry Night Synthesizer - Main Application
 */

var songid = 0 // Current song
var hasStarted = false // Track if user has started playback
var midiInitialized = false // Track if MIDI has been initialized
var isLoading = false // Track if MIDI is currently loading
var scheme = 0 // 0 = notes disappear, 1 = notes stay on
var player
var colorElements = [] // Store color elements for piano keys

// Initialize MIDI - must be called during user gesture for iOS
var initializeMIDI = function (onSuccess) {
	if (midiInitialized) {
		onSuccess && onSuccess()
		return
	}
	midiInitialized = true

	// Create loader but we'll hide it since we use our own loading indicator
	MIDI.loader = new sketch.ui.Timer()
	// Hide the default sk-timer loading animation
	setTimeout(function() {
		$(".sk-timer").hide()
	}, 0)

	MIDI.loadPlugin({
		soundfontUrl: "./midi/",
		onprogress: function (state, progress) {
			MIDI.loader.setValue(progress * 100)
		},
		onsuccess: function () {
			player = MIDI.Player
			player.timeWarp = 1

			// Set up piano key color listener
			var colorMap = MIDI.Synesthesia.map()
			player.addListener(function (data) {
				var pianoKey = data.note - 21
				var d = colorElements[pianoKey]
				if (d) {
					if (data.message === 144) {
						d.style.background = colorMap2[data.note - 27]
						d.classList.add("pressed")
						if (scheme === 1) {
							d.style.opacity = 1.0
						}
					} else {
						if (scheme === 0) {
							d.style.background = ""
						}
						if (scheme === 1) {
							d.style.opacity = 0.6
						}
						d.classList.remove("pressed")
					}
				}
			})

			MIDIPlayerPercentage(player)

			// Load and play the first song
			player.loadFile(song[songid], function () {
				isLoading = false
				$("#nowplaying").html(songNames[songid])
				player.start()
				onSuccess && onSuccess()
			})
		},
	})
}

// Start playback for the first time
var startFirstPlay = function () {
	if (hasStarted || isLoading) return
	hasStarted = true
	isLoading = true

	// Show loading state on the play button
	$("#big-play-btn").addClass("loading")

	// Initialize MIDI during user gesture (required for iOS Safari)
	// The AudioContext is created inside loadPlugin, so iOS will allow it
	initializeMIDI(function () {
		// MIDI loaded, now fade out and show player
		$("#titler").fadeOut(300)
		$("#play-overlay").fadeOut(400, function () {
			$("#playerdiv").fadeIn(300)
			$("#playPauseStop").button({ icon: "ui-icon-pause" })
		})
	})
}

// Toggle between Pause and Play modes.
var pausePlayStop = function (stop) {
	if (!player) return // MIDI not initialized yet
	var d = $("#playPauseStop")
	if (stop) {
		d.button({ icon: "ui-icon-play" })
		clearColors()
		MIDI.Player.stop()
	} else if (MIDI.Player.playing) {
		d.button({ icon: "ui-icon-play" })
		MIDI.Player.pause(true)
	} else {
		d.button({ icon: "ui-icon-pause" })
		// Resume audio context if suspended (for iOS)
		var ctx = MIDI.WebAudio && MIDI.WebAudio.getContext && MIDI.WebAudio.getContext()
		if (ctx && ctx.state === "suspended") {
			ctx.resume().then(function() {
				MIDI.Player.resume()
			})
		} else {
			MIDI.Player.resume()
		}
	}
}

// Change scheme from notes stay to notes disappear
var changeScheme = function () {
	if (scheme === 0) {
		scheme = 1 // Notes stay scheme
		$("#colors div").each(function () {
			if ($(this).hasClass("pressed")) {
				$(this).css("opacity", "0.6")
			}
		})
		$("#scheme").button({
			icon: "ui-icon-arrowthickstop-1-s",
		})
	} else {
		scheme = 0 // Notes disappear scheme
		$("#colors div").each(function () {
			$(this).removeClass("pressed")
			$(this).css("background", "")
			$(this).css("opacity", ".75")
		})
		$("#scheme").button({
			icon: "ui-icon-arrowreturnthick-1-n",
		})
	}
}

// Info function and dialog
var getInfo = function () {
	if ($("#info-dialog").dialog("isOpen")) {
		$("#info-dialog").dialog("close")
	} else {
		$("#info-dialog").dialog("open")
	}
	$("#nowplaying").html(songNames[songid])
}

// Clear all colors on app
var clearColors = function () {
	$("#colors div").each(function () {
		$(this).removeClass("pressed")
		$(this).css("background", "")
		$(this).css("opacity", ".75")
	})
}

// Create new color map of Starry Night Colors
var colorMap2 = new Array(89)
var starryNightColors = [
	"#02092B",
	"#374F74",
	"#6D96BE",
	"#616C67",
	"#91AEAA",
	"#766B3C",
	"#A0A778",
	"#A28A31",
	"#C6C267",
	"#CFAA28",
	"#EDDC57",
	"#FDF66F",
]
for (var i = 0; i < colorMap2.length; i++) {
	colorMap2[i] = starryNightColors[i % 12]
}

var MIDIPlayerPercentage = function (player) {
	// update the timestamp
	var time1 = document.getElementById("time1")
	var time2 = document.getElementById("time2")
	var capsule = document.getElementById("capsule")
	var timeCursor = document.getElementById("cursor")

	eventjs.add(capsule, "drag", function (event, self) {
		eventjs.cancel(event)
		player.currentTime = (self.x / 420) * player.endTime
		if (player.currentTime < 0) player.currentTime = 0
		if (player.currentTime > player.endTime)
			player.currentTime = player.endTime
		if (self.state === "down") {
			player.pause(true)
		} else if (self.state === "up") {
			player.resume()
		}
	})

	function timeFormatting(n) {
		var minutes = (n / 60) >> 0
		var seconds = String((n - minutes * 60) >> 0)
		if (seconds.length == 1) seconds = "0" + seconds
		return minutes + ":" + seconds
	}

	player.getNextSong = function (n) {
		clearColors()
		songid = Math.abs((songid + n) % song.length)
		// Resume audio context if needed (for iOS after backgrounding)
		var ctx = MIDI.WebAudio && MIDI.WebAudio.getContext && MIDI.WebAudio.getContext()
		if (ctx && ctx.state === "suspended") {
			ctx.resume().then(function() {
				player.loadFile(song[songid], player.start)
			})
		} else {
			player.loadFile(song[songid], player.start)
		}
		$("#nowplaying").html(songNames[songid])
		$("#playPauseStop").button({ icon: "ui-icon-pause" })
	}

	player.setAnimation(function (data, element) {
		var percent = data.now / data.end
		var now = data.now >> 0
		var end = data.end >> 0
		if (now === end) {
			// go to next song
			songid = (songid + 1) % song.length
			player.loadFile(song[songid], player.start)
			$("#nowplaying").html(songNames[songid])
		}
	})
}

// Handle page visibility changes (for iOS app switching)
document.addEventListener("visibilitychange", function () {
	if (document.visibilityState === "visible" && hasStarted) {
		// Try to resume audio context when returning to page
		var ctx = MIDI.WebAudio && MIDI.WebAudio.getContext && MIDI.WebAudio.getContext()
		if (ctx && ctx.state === "suspended") {
			ctx.resume()
		}
	}
})

// Set up jQuery buttons and initialize app
$(function () {
	// Hide controls initially
	$("#playerdiv").hide()

	// Show title and play button
	$("#titler").fadeIn(2000)
	$("#big-play-btn-wrapper").fadeIn(2000)

	$("#playerdiv").draggable()
	$("#playPauseStop").button({
		icon: "ui-icon-pause",
		showLabel: false,
	})
	$("#backward").button({
		icon: "ui-icon-seek-prev",
		showLabel: false,
	})
	$("#forward").button({
		icon: "ui-icon-seek-next",
		showLabel: false,
	})
	$("#scheme").button({
		icon: "ui-icon-arrowreturnthick-1-n",
		showLabel: false,
	})
	$("#info").button({
		icon: "ui-icon-help",
		showLabel: false,
	})

	// Initialize tooltips for player buttons
	$(".player button").tooltip({
		position: {
			my: "center bottom-8",
			at: "center top",
			collision: "flipfit"
		},
		show: { delay: 400, duration: 150 },
		hide: { duration: 100 },
		tooltipClass: "player-tooltip"
	})

	// Initialize info dialog
	$("#info-dialog").dialog({
		modal: false,
		autoOpen: false,
		resizable: false,
		height: "auto",
		width: 320,
	})

	// Let space pause/play
	$(document).on("keydown", function (e) {
		if (e.keyCode === 32) {
			e.preventDefault()
			pausePlayStop()
		}
	})
})

// Set up visual elements on window load (but defer MIDI init until user interaction for iOS)
eventjs.add(window, "load", function (event) {
	// Load fonts
	var link = document.createElement("link")
	link.href = "//fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=Crimson+Text:ital@0;1&display=swap"
	link.rel = "stylesheet"
	link.type = "text/css"
	document.body.appendChild(link)

	// Load up the piano keys (visual only - MIDI initialized on user click)
	var colors = document.getElementById("colors")
	for (var n = 0; n < 88; n++) {
		var d = document.createElement("div")
		d.innerHTML = MIDI.noteToKey[n + 21]
		colorElements.push(d)
		colors.appendChild(d)
	}
})

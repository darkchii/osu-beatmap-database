CREATE TABLE IF NOT EXISTS `beatmap` (
  `beatmap_id` int(11) NOT NULL,
  `beatmapset_id` int(11) DEFAULT NULL,
  `approved` tinyint(4) DEFAULT NULL,
  `total_length` int(11) DEFAULT NULL,
  `hit_length` int(11) DEFAULT NULL,
  `version` text CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `artist` text CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `title` text CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `creator` text CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `creator_id` int(11) DEFAULT NULL,
  `mode` tinyint(4) DEFAULT NULL,
  `cs` float DEFAULT NULL,
  `od` float DEFAULT NULL,
  `ar` float DEFAULT NULL,
  `hp` float DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `submitted_date` datetime DEFAULT NULL,
  `last_updated_date` datetime DEFAULT NULL,
  `bpm` int(11) DEFAULT NULL,
  `bpm_min` int(11) DEFAULT NULL,
  `bpm_max` int(11) DEFAULT NULL,
  `source` text CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `tags` text CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `genre_id` tinyint(4) DEFAULT NULL,
  `language_id` tinyint(4) DEFAULT NULL,
  `max_combo` int(11) DEFAULT NULL,
  `star_rating` double DEFAULT NULL,
  `star_rating_aim` double DEFAULT NULL,
  `star_rating_speed` double DEFAULT NULL,
  `eyup_star_rating` double DEFAULT NULL,
  `hit_objects` int(11) DEFAULT NULL,
  `num_circles` int(11) DEFAULT NULL,
  `num_sliders` int(11) DEFAULT NULL,
  `num_spinners` int(11) DEFAULT NULL,
  `favorites` int(11) DEFAULT NULL,
  `plays` int(11) DEFAULT NULL,
  `passes` int(11) DEFAULT NULL,
  `recalculate` tinyint(4) DEFAULT 1,
  `max_score` int(11) DEFAULT NULL,
  `packs` text COLLATE utf8_bin DEFAULT NULL,
  `rating` float DEFAULT NULL,
  `video` tinyint(1) DEFAULT NULL,
  `storyboard` tinyint(1) DEFAULT NULL,
  `download_unavailable` tinyint(1) DEFAULT NULL,
  `audio_unavailable` tinyint(1) DEFAULT NULL,
  `file_md5` char(32) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`beatmap_id`),
  KEY `mode` (`mode`),
  KEY `Approved` (`approved`),
  KEY `beatmapset_id` (`beatmapset_id`),
  FULLTEXT KEY `Text` (`version`,`artist`,`title`,`creator`,`source`,`tags`),
  FULLTEXT KEY `Version` (`version`),
  FULLTEXT KEY `Artist` (`artist`),
  FULLTEXT KEY `Title` (`title`),
  FULLTEXT KEY `Creator` (`creator`),
  FULLTEXT KEY `Source` (`source`),
  FULLTEXT KEY `Tags` (`tags`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE IF NOT EXISTS `osu_beatmaps` (
  `beatmap_id` mediumint(8) unsigned NOT NULL AUTO_INCREMENT,
  `beatmapset_id` mediumint(8) unsigned DEFAULT NULL,
  `user_id` int(10) unsigned NOT NULL DEFAULT 0,
  `filename` varchar(150) COLLATE utf8_bin DEFAULT NULL,
  `checksum` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `version` varchar(80) CHARACTER SET latin1 NOT NULL DEFAULT '',
  `total_length` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `hit_length` mediumint(8) unsigned NOT NULL DEFAULT 0,
  `countTotal` smallint(5) unsigned NOT NULL DEFAULT 0,
  `countNormal` smallint(5) unsigned NOT NULL DEFAULT 0,
  `countSlider` smallint(5) unsigned NOT NULL DEFAULT 0,
  `countSpinner` smallint(5) unsigned NOT NULL DEFAULT 0,
  `diff_drain` float unsigned NOT NULL DEFAULT 0,
  `diff_size` float unsigned NOT NULL DEFAULT 0,
  `diff_overall` float unsigned NOT NULL DEFAULT 0,
  `diff_approach` float unsigned NOT NULL DEFAULT 0,
  `playmode` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `approved` tinyint(4) NOT NULL DEFAULT 0,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp(),
  `difficultyrating` float NOT NULL DEFAULT 0,
  `playcount` int(10) unsigned NOT NULL DEFAULT 0,
  `passcount` int(10) unsigned NOT NULL DEFAULT 0,
  `orphaned` tinyint(1) NOT NULL DEFAULT 0,
  `youtube_preview` varchar(50) COLLATE utf8_bin DEFAULT NULL,
  `score_version` tinyint(4) NOT NULL DEFAULT 1,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `bpm` float DEFAULT NULL,
  PRIMARY KEY (`beatmap_id`),
  KEY `beatmapset_id` (`beatmapset_id`),
  KEY `filename` (`filename`),
  KEY `checksum` (`checksum`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2678466 DEFAULT CHARSET=utf8 COLLATE=utf8_bin ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `osu_beatmap_difficulty` (
  `beatmap_id` int(11) unsigned NOT NULL,
  `mode` tinyint(4) NOT NULL DEFAULT 0,
  `mods` int(101) unsigned NOT NULL,
  `diff_unified` float NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`beatmap_id`,`mode`,`mods`),
  KEY `diff_sort` (`mode`,`mods`,`diff_unified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `osu_beatmap_difficulty_attribs` (
  `beatmap_id` int(11) unsigned NOT NULL,
  `mode` tinyint(3) unsigned NOT NULL,
  `mods` int(11) unsigned NOT NULL,
  `attrib_id` tinyint(3) unsigned NOT NULL COMMENT 'see osu_difficulty_attribs table',
  `value` float DEFAULT NULL,
  PRIMARY KEY (`beatmap_id`,`mode`,`mods`,`attrib_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `osu_difficulty_attribs` (
  `attrib_id` smallint(5) unsigned NOT NULL,
  `name` varchar(256) NOT NULL DEFAULT '',
  `visible` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`attrib_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `osu_beatmap_difficulty_data` (
  `beatmap_id` int(11) unsigned NOT NULL,
  `mode` tinyint(3) unsigned NOT NULL,
  `mods` int(11) unsigned NOT NULL,
  `diff_unified` float NOT NULL,
  `diff_aim` float NOT NULL,
  `diff_speed` float NOT NULL,
  `od` float NOT NULL,
  `ar` float NOT NULL,
  `max_combo` int(11) NOT NULL,
  `diff_strain` float NOT NULL,
  `hit300` float NOT NULL,
  `score_multiplier` float NOT NULL,
  `flashlight_rating` float NOT NULL,
  `slider_factor` float NOT NULL,
  `speed_note_count` int(11) NOT NULL,
  `speed_difficult_strain_count` int(11) NOT NULL,
  `aim_difficult_strain_count` int(11) NOT NULL,
  `hit100` float NOT NULL,
  `mono_stamina_factor` float NOT NULL,
  PRIMARY KEY (`beatmap_id`,`mode`,`mods`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO osu_difficulty_attribs 
  (attrib_id, name, visible)
VALUES
  (1, 'Aim', 1),
  (3, 'Speed', 1),
  (5, 'OD', 0),
  (7, 'AR', 0),
  (9, 'Max combo', 0),
  (11, 'Strain', 1),
  (13, 'Hit window 300', 0),
  (15, 'Score multiplier', 0),
  (17, 'Flashlight rating', 1),
  (19, 'Slider Factor', 1),
  (21, 'Speed Note Count', 1),
  (23, 'Speed Difficult Strain Count', 1),
  (25, 'Aim Difficult Strain Count', 1),
  (27, 'Hit window 100', 0),
  (29, 'Mono Stamina Factor', 1)

CREATE TABLE IF NOT EXISTS `osu_beatmap_scoring_attribs` (
  `beatmap_id` int(11) unsigned NOT NULL,
  `mode` tinyint(3) unsigned NOT NULL,
  `legacy_accuracy_score` int(11) DEFAULT NULL,
  `legacy_combo_score` BIGINT DEFAULT NULL,
  `legacy_bonus_score_ratio` float DEFAULT NULL,
  `legacy_bonus_score` INT(11) DEFAULT NULL,
  `max_combo` int(11) DEFAULT NULL,
  PRIMARY KEY (`beatmap_id`,`mode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

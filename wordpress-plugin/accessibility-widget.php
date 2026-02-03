<?php
/**
 * Plugin Name: Accessibility Widget
 * Plugin URI: https://github.com/kshah902/accessibility-widget-standalone
 * Description: Add a comprehensive accessibility widget to your WordPress site. Features include text size adjustment, high contrast mode, dyslexia font, color blindness filters, text-to-speech, and more.
 * Version: 1.0.0
 * Author: Krunal Shah
 * Author URI: https://github.com/kshah902
 * License: MIT
 * Text Domain: accessibility-widget
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('A11Y_WIDGET_VERSION', '1.0.0');
define('A11Y_WIDGET_CDN_BASE', 'https://cdn.jsdelivr.net/npm/@krunalshah/accessibility-widget-standalone@');

/**
 * Enqueue the accessibility widget scripts and styles
 */
function a11y_widget_enqueue_scripts() {
    $version = A11Y_WIDGET_VERSION;
    $cdn_base = A11Y_WIDGET_CDN_BASE . $version;

    // Enqueue CSS
    wp_enqueue_style(
        'a11y-widget-css',
        $cdn_base . '/dist/accessibility.css',
        array(),
        $version
    );

    // Enqueue JavaScript (in footer)
    wp_enqueue_script(
        'a11y-widget-js',
        $cdn_base . '/dist/standalone.global.js',
        array(),
        $version,
        true
    );
}

add_action('wp_enqueue_scripts', 'a11y_widget_enqueue_scripts');

/**
 * Add settings link on plugin page
 */
function a11y_widget_settings_link($links) {
    $settings_link = '<a href="https://github.com/kshah902/accessibility-widget-standalone#readme" target="_blank">Documentation</a>';
    array_unshift($links, $settings_link);
    return $links;
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'a11y_widget_settings_link');

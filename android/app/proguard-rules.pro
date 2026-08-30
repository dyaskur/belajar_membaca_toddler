# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor plugin keep rules arrive automatically via consumerProguardFiles in
# @capacitor/android, so they are deliberately not duplicated here.

# Keep crash reports readable. AGP puts the mapping file in the AAB, so Play can
# deobfuscate stack traces — this is also what clears the Play Console warning about
# a missing deobfuscation file.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
